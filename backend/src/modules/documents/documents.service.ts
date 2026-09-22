import fs from "fs/promises";
import { NotFoundError } from "../../shared/errors";
import { pool } from "../../infrastructure/database/pool";
import { extractText, chunkText } from "./documents.processing";
import { embedChunks } from "./documents.processing";

interface UploadedFile {
    originalname: string;
    path: string;
}

export async function listDocuments(ownerId: string) {
    const result = await pool.query(
        "SELECT id, filename, status, created_at FROM documents WHERE owner_id = $1 ORDER BY created_at DESC",
        [ownerId],
    );
    return result.rows;
}

import { extractText, chunkText } from "./documents.processing";

export async function saveDocument(ownerId: string, file: UploadedFile) {
    const result = await pool.query(
        `INSERT INTO documents (owner_id, filename, storage_path, status)
     VALUES ($1, $2, $3, 'uploaded')
     RETURNING id, owner_id, filename, storage_path, status, created_at`,
        [ownerId, file.originalname, file.path],
    );
    const document = result.rows[0];

    try {
        await pool.query(
            "UPDATE documents SET status = 'processing' WHERE id = $1",
            [document.id],
        );

        const text = await extractText(document.storage_path);
        const chunks = chunkText(text);

        for (let i = 0; i < chunks.length; i++) {
            await pool.query(
                "INSERT INTO chunks (document_id, content, chunk_index) VALUES ($1, $2, $3)",
                [document.id, chunks[i], i],
            );
        }

        await embedChunks(document.id);

        const updated = await pool.query(
            `UPDATE documents SET status = 'ready' WHERE id = $1
       RETURNING id, owner_id, filename, storage_path, status, created_at`,
            [document.id],
        );
        return updated.rows[0];
    } catch (err) {
        await pool.query(
            "UPDATE documents SET status = 'failed' WHERE id = $1",
            [document.id],
        );
        throw err;
    }
}

export async function deleteDocument(documentId: string, ownerId: string) {
    const result = await pool.query(
        "DELETE FROM documents WHERE id = $1 AND owner_id = $2 RETURNING storage_path",
        [documentId, ownerId],
    );

    if (result.rows.length === 0) {
        throw new NotFoundError("Document");
    }

    const { storage_path } = result.rows[0];
    await fs.unlink(storage_path).catch(() => {
        // file already gone from disk — DB row is still correctly removed, not fatal
    });

    return { success: true };
}

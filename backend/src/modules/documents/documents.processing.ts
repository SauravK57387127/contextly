import { PDFParse } from "pdf-parse";
import { getEmbedding } from "../../infrastructure/embeddings";
import { pool } from "../../infrastructure/database/pool";

export async function embedChunks(documentId: string) {
    const result = await pool.query(
        "SELECT id, content FROM chunks WHERE document_id = $1",
        [documentId],
    );

    for (const chunk of result.rows) {
        const vector = await getEmbedding(chunk.content);
        await pool.query("UPDATE chunks SET embedding = $1 WHERE id = $2", [
            JSON.stringify(vector),
            chunk.id,
        ]);
    }
}

export async function extractText(fileUrl: string): Promise<string> {
    const res = await fetch(fileUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
}

export function chunkText(
    text: string,
    chunkSize = 400,
    overlap = 50,
): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
        const end = start + chunkSize;
        chunks.push(words.slice(start, end).join(" "));
        start = end - overlap; // step back by the overlap amount before the next chunk
    }

    return chunks;
}

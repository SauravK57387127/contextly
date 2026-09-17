
import { pool } from "../../infrastructure/database/pool";

interface UploadedFile {
  originalname: string;
  path: string;
}

export async function saveDocument(ownerId: string, file: UploadedFile){
  const result = await pool.query(
    `INSERT INTO documents (owner_id, filename, storage_path, status)
    VALUES ($1, $2, $3, 'uploaded')
    RETURNING id, owner_id, filename, storage_path, status, created_at`,
    [ownerId, file.originalname, file.path]
  );
  return result.rows[0];
}

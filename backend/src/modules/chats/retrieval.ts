import { pool } from "../../infrastructure/database/pool";
import { getEmbedding } from "../../infrastructure/embeddings";

export async function retrieveRelevantChunks(question: string, documentId: string, topK = 5) {
  const questionVector = await getEmbedding(question);

 const result = await pool.query(
  `SELECT id, content, chunk_index
   FROM chunks
   WHERE document_id = $2
   ORDER BY embedding <=> $1
   LIMIT $3`,
  [JSON.stringify(questionVector), documentId, topK]
);

  return result.rows; // [{ content, chunk_index }, ...]
}

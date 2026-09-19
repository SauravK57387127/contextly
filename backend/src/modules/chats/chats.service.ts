import { pool } from "../../infrastructure/database/pool";
import { NotFoundError } from "../../shared/errors";

export async function createChat(ownerId: string, documentId: string, title: string) {
  const result = await pool.query(
    `INSERT INTO chats (owner_id, document_id, title) VALUES ($1, $2, $3)
     RETURNING id, owner_id, document_id, title, created_at`,
    [ownerId, documentId, title]
  );
  return result.rows[0];
}

export async function listChats(ownerId: string) {
  const result = await pool.query(
    `SELECT id, document_id, title, created_at FROM chats WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

export async function getChatWithMessages(chatId: string, ownerId: string) {
  const chatResult = await pool.query(
    `SELECT id, document_id, title, created_at FROM chats WHERE id = $1 AND owner_id = $2`,
    [chatId, ownerId]
  );
  const chat = chatResult.rows[0];
  if (!chat) throw new NotFoundError("Chat");

  const messagesResult = await pool.query(
    `SELECT id, role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
    [chatId]
  );

  return { chat, messages: messagesResult.rows };
}

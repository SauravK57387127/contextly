import { pool } from "../../infrastructure/database/pool";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { createChatSchema } from "./chats.schema";
import * as chatsService from "./chats.service";
import { asyncHandler } from "../../middlewares/errorHandler";
import { getContext } from "../../shared/context";

const STUB_ANSWER = "This is a placeholder answer. Real retrieval and generation arrive in a later phase.";

export const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body; // validation kept minimal here deliberately — real shape lands with real logic in Phase 7
  const { userId } = getContext();

  // Confirm ownership before doing anything else
  const chatCheck = await pool.query("SELECT id FROM chats WHERE id = $1 AND owner_id = $2", [req.params.id, userId]);
  if (chatCheck.rows.length === 0) throw new NotFoundError("Chat");

  await pool.query("INSERT INTO messages (chat_id, role, content) VALUES ($1, 'user', $2)", [req.params.id, content]);

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");

  const words = STUB_ANSWER.split(" ");
  let fullAnswer = "";

  for (const word of words) {
    fullAnswer += word + " ";
    res.write(word + " ");
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  await pool.query("INSERT INTO messages (chat_id, role, content) VALUES ($1, 'assistant', $2)", [req.params.id, fullAnswer.trim()]);

  res.end();
});

function parseCreateBody(body: unknown) {
  const result = createChatSchema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error.issues.forEach((issue) => { fields[issue.path.join(".")] = issue.message; });
    throw new ValidationError("Validation failed", fields);
  }
  return result.data;
}

export const create = asyncHandler(async (req, res) => {
  const { document_id, title } = parseCreateBody(req.body);
  const { userId } = getContext();
  const chat = await chatsService.createChat(userId!, document_id, title);
  res.status(201).json({ success: true, data: chat });
});

export const list = asyncHandler(async (req, res) => {
  const { userId } = getContext();
  const chats = await chatsService.listChats(userId!);
  res.status(200).json({ success: true, data: chats });
});

export const getOne = asyncHandler(async (req, res) => {
  const { userId } = getContext();
  const result = await chatsService.getChatWithMessages(req.params.id, userId!);
  res.status(200).json({ success: true, data: result });
});

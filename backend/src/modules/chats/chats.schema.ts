import { z } from "zod";

export const createChatSchema = z.object({
  document_id: z.string(),
  title: z.string().min(1),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1),
});

import { pool } from "../../infrastructure/database/pool";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { createChatSchema } from "./chats.schema";
import * as chatsService from "./chats.service";
import { asyncHandler } from "../../middlewares/errorHandler";
import { getContext } from "../../shared/context";
import { retrieveRelevantChunks } from "./retrieval";
import { buildPrompt, streamAnswer } from "../../infrastructure/generation";

export const sendMessage = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { userId } = getContext();

    const chatResult = await pool.query(
        "SELECT id, document_id FROM chats WHERE id = $1 AND owner_id = $2",
        [req.params.id, userId],
    );
    const chat = chatResult.rows[0];
    if (!chat) throw new NotFoundError("Chat");

    await pool.query(
        "INSERT INTO messages (chat_id, role, content) VALUES ($1, 'user', $2)",
        [req.params.id, content],
    );

    const chunks = await retrieveRelevantChunks(content, chat.document_id);

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // No relevant content at all — don't call Gemini with empty context, just say so
    if (chunks.length === 0) {
        const message =
            "I couldn't find anything relevant to that question in this document.";
        res.write(message);
        await pool.query(
            "INSERT INTO messages (chat_id, role, content, sources) VALUES ($1, 'assistant', $2, $3)",
            [req.params.id, message, JSON.stringify([])],
        );
        return res.end();
    }

    const sources = chunks.map((c) => ({
        chunk_index: c.chunk_index,
        snippet: c.content.slice(0, 100),
    }));
    res.write(`__SOURCES__${JSON.stringify(sources)}__END_SOURCES__\n`);

    const prompt = buildPrompt(chunks, content);

    let fullAnswer = "";
    try {
        fullAnswer = await streamAnswer(prompt, (chunk) => res.write(chunk));
    } catch {
        const message =
            "\n\n[Something went wrong generating a response. Please try again.]";
        res.write(message);
        fullAnswer = message;
    }

    if (fullAnswer) {
        await pool.query(
            "INSERT INTO messages (chat_id, role, content, sources) VALUES ($1, 'assistant', $2, $3)",
            [req.params.id, fullAnswer.trim(), JSON.stringify(sources)],
        );
    }

    res.end();
});

function parseCreateBody(body: unknown) {
    const result = createChatSchema.safeParse(body);
    if (!result.success) {
        const fields: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            fields[issue.path.join(".")] = issue.message;
        });
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
    const result = await chatsService.getChatWithMessages(
        req.params.id,
        userId!,
    );
    res.status(200).json({ success: true, data: result });
});

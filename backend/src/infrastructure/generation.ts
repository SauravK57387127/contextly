const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION = `You are answering questions using only the provided context from a document.
If the answer isn't contained in the context, say you don't know rather than guessing.
Do not use outside knowledge.`;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number) {
    return status >= 500 || status === 429; // server errors and rate limits only — not bad requests
}

async function connectWithRetry(
    prompt: string,
    maxAttempts = 3,
): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s to establish the connection

        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?key=${GOOGLE_API_KEY}&alt=sse`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: SYSTEM_INSTRUCTION }],
                        },
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                    }),
                },
            );
            clearTimeout(timeout);
            if (res.ok) return res;
            if (!isRetryable(res.status))
                throw new Error(`Generation failed: ${res.status}`);
            lastError = new Error(`Generation failed: ${res.status}`);
        } catch (err) {
            clearTimeout(timeout);
            lastError = err;
        }

        const backoff = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s
        const jitter = Math.random() * 200;
        await sleep(backoff + jitter);
    }

    throw lastError;
}

export function buildPrompt(
    chunks: { content: string }[],
    question: string,
): string {
    const context = chunks
        .map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`)
        .join("\n\n");
    return `Context:\n${context}\n\nQuestion: ${question}`;
}

export async function streamAnswer(
    prompt: string,
    onChunk: (text: string) => void,
): Promise<string> {
    const res = await connectWithRetry(prompt);
    if (!res.body) throw new Error("No response body from generation API");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullAnswer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep any incomplete trailing line for next read

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    fullAnswer += text;
                    onChunk(text);
                }
            } catch {
                /* incomplete JSON fragment, skip */
            }
        }
    }

    return fullAnswer;
}

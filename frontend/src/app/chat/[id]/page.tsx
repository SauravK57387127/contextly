"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import ReactMarkdown from "react-markdown";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: { chunk_index: number; snippet: string }[];
}

export default function ChatPage() {
    const { id } = useParams<{ id: string }>();
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([]);
    const [title, setTitle] = useState("");
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }
        if (user) loadChat();
    }, [authLoading, user]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function loadChat() {
        try {
            const res = await apiClient(`/chats/${id}`);
            setTitle(res.data.chat.title);
            setMessages(res.data.messages);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Could not load chat",
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const question = input.trim();
        if (!question || sending) return;

        setInput("");
        setSending(true);
        setError(null);

        const userMessage: Message = {
            id: `temp-${Date.now()}`,
            role: "user",
            content: question,
        };
        setMessages((prev) => [...prev, userMessage]);

        const assistantId = `temp-assistant-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: "" },
        ]);

        try {
            const token = (
                await import("@/lib/api-client")
            ).getCurrentAccessToken?.();
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/chats/${id}/messages`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify({ content: question }),
                },
            );

            if (!res.body) throw new Error("No response body");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            let sourcesParsed = false;
            let leftover = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                let chunk = leftover + decoder.decode(value);
                leftover = "";

                if (!sourcesParsed) {
                    const match = chunk.match(
                        /^__SOURCES__(.*?)__END_SOURCES__\n/s,
                    );
                    if (match) {
                        const sources = JSON.parse(match[1]);
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantId ? { ...m, sources } : m,
                            ),
                        );
                        chunk = chunk.slice(match[0].length);
                        sourcesParsed = true;
                    } else {
                        leftover = chunk; // sentinel hasn't fully arrived yet, wait for more
                        continue;
                    }
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: m.content + chunk }
                            : m,
                    ),
                );
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to send message",
            );
        } finally {
            setSending(false);
        }
    }

    if (loading)
        return (
            <main className="p-6 text-sm text-neutral-500">
                Loading chat...
            </main>
        );

    return (
        <main className="flex min-h-screen flex-col bg-neutral-50">
            <header className="border-b border-neutral-200 bg-white px-6 py-4">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                    ← Dashboard
                </button>
                <h1 className="mt-1 text-lg font-semibold text-neutral-900">
                    {title}
                </h1>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`max-w-lg rounded-lg px-4 py-2 text-sm ${
                            m.role === "user"
                                ? "ml-auto bg-neutral-900 text-white"
                                : "bg-white border border-neutral-200 text-neutral-800"
                        }`}
                    >
                        {m.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>
                                    {m.content || (sending ? "…" : "")}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            m.content
                        )}

                        {m.role === "assistant" &&
                            m.sources &&
                            m.sources.length > 0 && (
                                <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-400">
                                    {m.sources.map((s, i) => (
                                        <div key={i}>
                                            Excerpt {s.chunk_index + 1}: "
                                            {s.snippet}..."
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {error && <p className="px-6 text-sm text-red-600">{error}</p>}

            <form
                onSubmit={handleSend}
                className="flex gap-2 border-t border-neutral-200 bg-white p-4"
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                    placeholder="Ask something about this document..."
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <button
                    type="submit"
                    disabled={sending}
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </main>
    );
}

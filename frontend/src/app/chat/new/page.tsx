"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

function NewChatContent() {
    const router = useRouter();
    const params = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const documentId = params.get("documentId");
        const filename = params.get("filename") ?? "New chat";

        if (!documentId) {
            setError("No document selected");
            return;
        }

        apiClient("/chats", {
            method: "POST",
            body: { document_id: documentId, title: filename },
        })
            .then((res) => router.replace(`/chat/${res.data.id}`))
            .catch((err) =>
                setError(
                    err instanceof Error ? err.message : "Could not start chat",
                ),
            );
    }, [authLoading, user, params, router]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50">
            <p className="text-sm text-neutral-500">
                {error ?? "Starting chat..."}
            </p>
        </main>
    );
}

export default function NewChatPage() {
    return (
        <Suspense fallback={<p>Starting chat...</p>}>
            <NewChatContent />
        </Suspense>
    );
}

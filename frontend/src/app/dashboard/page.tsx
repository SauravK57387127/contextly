"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Doc { id: string; filename: string; status: string; created_at: string; }
interface Chat { id: string; title: string; document_id: string; created_at: string; }

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [chats, setChats] = useState<Chat[]>([]);
  const router = useRouter();

const { user, isLoading, logout } = useAuth();

useEffect(() => {
  if (!isLoading && !user) { router.push("/login"); return; }
  if (user) loadDocuments();
}, [isLoading, user]); 

  async function loadDocuments() {
    try {
      const res = await apiClient("/documents");
      setDocuments(res.data);
      const chatsRes = await apiClient("/chats");
    setChats(chatsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClient("/documents", { method: "POST", body: formData, isFormData: true });
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
  setDeletingId(id);
  setError(null);
  try {
    await apiClient(`/documents/${id}`, { method: "DELETE" });
    setDocuments((docs) => docs.filter((doc) => doc.id !== id));
  } catch (err) {
    setError(err instanceof Error ? err.message : "Delete failed");
  } finally {
    setDeletingId(null);
  }
}

async function handleLogout() {
  await logout();
  router.push("/login");
}

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-neutral-900">Contextly</h1>
        <button onClick={handleLogout} className="text-sm text-neutral-500 hover:text-neutral-900">Log out</button>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center">
          <label className="cursor-pointer text-sm text-neutral-600">
            {uploading ? "Uploading..." : "Click to upload a PDF"}
            <input type="file" accept="application/pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-neutral-500">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
             <li key={doc.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3">
  <span className="text-sm text-neutral-800">{doc.filename}</span>
  <div className="flex items-center gap-3">
    <span className="text-xs uppercase tracking-wide text-neutral-400">{doc.status}</span>
    <button
      onClick={() => handleDelete(doc.id)}
      disabled={deletingId === doc.id}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {deletingId === doc.id ? "Deleting..." : "Delete"}
    </button>
<a href={`/chat/new?documentId=${doc.id}&filename=${encodeURIComponent(doc.filename)}`}
   className="text-xs text-neutral-600 hover:text-neutral-900 underline">
  Start chat
</a>
  </div>
</li>
            ))}
          </ul>
        )}

        <div className="mt-10">
  <h2 className="mb-3 text-sm font-medium text-neutral-700">Your chats</h2>
  {chats.length === 0 ? (
    <p className="text-sm text-neutral-500">No chats yet — start one from a document above.</p>
  ) : (
    <ul className="space-y-2">
      {chats.map((chat) => (
        <li key={chat.id}>
          <a href={`/chat/${chat.id}`}
             className="block rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 hover:border-neutral-400">
            {chat.title}
          </a>
        </li>
      ))}
    </ul>
  )}
</div>
      </div>
    </main>
  );
}

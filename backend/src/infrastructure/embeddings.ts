const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );

  if (!res.ok) throw new Error(`Embedding request failed: ${res.status}`);

  const data = await res.json();
  return data.embedding.values;
}

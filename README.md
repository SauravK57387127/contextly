# Contextly

A Retrieval-Augmented Generation (RAG) application that lets a user upload PDF documents and ask natural-language questions grounded strictly in that document's content, with cited sources and streamed responses.

**Live app:** _[add your Vercel URL here]_
**Backend API:** _[add your Render URL here]_

---

## What this is, honestly

This project implements the core RAG pipeline end to end — ingestion, chunking, embedding, vector similarity search, and grounded generation — as a deliberately scoped, foundational implementation. It demonstrates a correct, working understanding of how retrieval-augmented generation functions as a system, not an exploration of the more advanced techniques the field offers (hybrid search, re-ranking, agentic retrieval loops, multi-turn conversational memory). Those are named explicitly below as intentional boundaries, not oversights.

---

## Architecture

```
┌──────────┐        ┌──────────────┐        ┌─────────────────────┐
│ Next.js  │  HTTP   │   Express    │  SQL   │  PostgreSQL          │
│ Frontend │ ──────▶ │   Backend    │ ─────▶ │  + pgvector          │
│ (Vercel) │ ◀────── │   (Render)   │ ◀───── │  (Neon)              │
└──────────┘ stream  └──────┬───────┘        └─────────────────────┘
                             │
                 ┌───────────┼────────────┐
                 ▼           ▼             ▼
          ┌───────────┐ ┌──────────┐ ┌───────────┐
          │ Cloudinary │ │  Gemini  │ │  Gemini   │
          │  (files)   │ │(embeddings)│(generation)│
          └───────────┘ └──────────┘ └───────────┘
```

**Ingestion path:** PDF upload → stored on Cloudinary → text extracted → split into overlapping fixed-size chunks → each chunk embedded via Gemini's embedding model → chunk text + vector stored together in a `pgvector`-enabled Postgres table.

**Query path:** user question embedded with the same model → cosine similarity search (`pgvector`'s `<=>` operator) retrieves the top-k nearest chunks, scoped to the document the chat is tied to → retrieved chunks + a grounding system instruction + the question are assembled into a prompt → sent to Gemini for generation → response streamed back to the client token-by-token → answer and its source chunks persisted.

---

## Stack and key decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | |
| Backend | Express + TypeScript, layered (routes → controllers → services) | |
| Database | PostgreSQL + `pgvector` extension (Neon) | Chosen over a dedicated vector database (Pinecone, Qdrant) — at this project's scale, colocating vectors with their source rows in one general-purpose database avoids operating a second service for no measurable benefit. |
| Data access | Raw `pg` (node-postgres), no ORM | Similarity search requires raw SQL (`<=>` operator) regardless of ORM choice; skipping one avoids schema/extension compatibility friction for no loss of capability at this scale. |
| Embeddings + Generation | Google Gemini API (`gemini-embedding-001`, `gemini-3.1-flash-lite`) | Both providers behind a single-purpose adapter function each (`getEmbedding`, `generateAnswer`-equivalent), so a provider swap touches one file, not the wider codebase. |
| File storage | Cloudinary (raw resource type) | Render's free-tier disks are ephemeral (wiped on every redeploy/restart); object storage is required for uploaded files to persist. |
| Auth | JWT access tokens (15 min) + rotating refresh tokens | Refresh tokens stored server-side, delivered via `httpOnly`, `Secure`, `SameSite` cookies — unreadable by client-side JavaScript even in an XSS scenario. Access tokens live in memory only, restored via a silent refresh call on load. |
| Password storage | `argon2id` | Not a fast general-purpose hash — deliberately slow, appropriate for password hashing specifically. |
| Rate limiting | `express-rate-limit` on `/auth/*` | Public auth endpoints are a real brute-force target once deployed; scoped narrowly rather than applied globally. |

---

## Deliberately out of scope

These were considered and explicitly excluded, not missed:

- **Multi-turn conversational memory** — every message is grounded fresh from retrieval, independent of prior messages in the same chat. Chat history is a record for the user to read, not context fed back into generation.
- **Hybrid search / re-ranking** — retrieval is pure vector similarity, top-k. A reasonable, standard baseline; not the most sophisticated retrieval strategy available.
- **Agentic behavior** — no tool-calling, no multi-step reasoning loops. Retrieve once, generate once, per question.
- **Multi-document chats** — one chat is scoped to exactly one document, by design.
- **Background job queue** — ingestion (extraction/chunking/embedding) runs synchronously within the upload request. Appropriate at this document size and traffic volume; would need to move to a queue (e.g. BullMQ) if either grew significantly.

---

## Known limitations

- **Cold starts** — both the Render backend and Neon database scale down on inactivity (free tier). The first request after idle time will be noticeably slower than subsequent ones; this is infrastructure behavior, not application latency.
- **Sequential embedding calls** — chunks are embedded one at a time per document, not in parallel, so ingestion time scales roughly linearly with document length. A deliberate simplicity tradeoff at this project's scale.

---

## Local setup

```bash
git clone https://github.com/SauravK57387127/contextly.git
cd contextly
./setup.sh
```

`setup.sh` installs dependencies for both `frontend/` and `backend/`, creates `.env` files from the provided examples, and applies the database schema (`backend/db-setup.sql`) — requires `DATABASE_URL` pointing at a reachable Postgres instance with the ability to create extensions.

Fill in real values in `backend/.env` and `frontend/.env.local` (API keys, JWT secret, connection strings) before starting either dev server:

```bash
cd backend && npm run dev
cd frontend && npm run dev   # separate terminal
```

Run `./smoke-test.sh` (with both servers running) to exercise the full flow — register, upload, create a chat, send a message — in one command.

---

## Project structure

```
contextly/
├── backend/     # Express + TypeScript API
│   ├── src/modules/     # feature-first: auth, documents, chats
│   ├── src/infrastructure/  # database, embeddings, generation adapters
│   ├── db-setup.sql
│   └── setup scripts
└── frontend/    # Next.js App Router UI
    └── src/app/
```

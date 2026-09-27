# Contextly

A Retrieval-Augmented Generation (RAG) application — upload PDF documents, ask natural-language questions grounded strictly in that document's content, with cited sources and streamed responses.

**Live app:** _[add your Vercel URL here]_
**Backend API:** _[add your Render URL here]_

---

## What this is, honestly

A deliberately scoped, foundational RAG implementation — ingestion, chunking, embedding, vector similarity search, and grounded generation, built end to end and correctly. Not an exploration of advanced RAG (hybrid search, re-ranking, agentic retrieval, multi-turn memory) — those are out of scope by design, listed below.

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

**Ingestion:** PDF upload → Cloudinary storage → text extraction → fixed-size chunking with overlap → Gemini embeddings → chunk + vector stored in `pgvector`.

**Query:** question embedded → cosine similarity search (`pgvector`'s `<=>` operator, top-k, scoped per document) → retrieved chunks + grounding system instruction + question → Gemini generation → streamed response with cited sources.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), TypeScript |
| Backend | Express, TypeScript — layered (routes → controllers → services) |
| Database | PostgreSQL + `pgvector` (Neon) |
| Data access | Raw `pg` (node-postgres), no ORM |
| Embeddings + Generation | Google Gemini API (`gemini-embedding-001`, `gemini-3.1-flash-lite`) |
| File storage | Cloudinary |
| Auth | JWT access tokens (15 min) + rotating refresh tokens, `httpOnly`/`Secure`/`SameSite` cookies |
| Password hashing | `argon2id` |
| Rate limiting | `express-rate-limit` on `/auth/*` |

---

## Out of scope

- Multi-turn conversational memory
- Hybrid search / re-ranking
- Agentic behavior
- Multi-document chats (one chat = one document)
- Background job queue for ingestion (runs synchronously)

---

## Local setup

```bash
git clone https://github.com/SauravK57387127/contextly.git
cd contextly
./setup.sh
```

Fill in real values in `backend/.env` and `frontend/.env.local`, then:

```bash
cd backend && npm run dev
cd frontend && npm run dev   # separate terminal
```

Run `./smoke-test.sh` to exercise register → upload → chat → message end to end.

> **Note:** free-tier hosting (Render, Neon) scales to zero on inactivity — expect a slower first request after idle periods. Chunk embedding runs sequentially, so ingestion time scales with document length.

---

## Project structure

```
contextly/
├── backend/     # Express + TypeScript API
│   ├── src/modules/         # feature-first: auth, documents, chats
│   ├── src/infrastructure/  # database, embeddings, generation adapters
│   ├── db-setup.sql
│   └── setup scripts
└── frontend/    # Next.js App Router UI
    └── src/app/
```

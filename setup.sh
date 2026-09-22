#!/bin/bash
set -e

echo "→ Installing backend dependencies"
cd backend && npm install && cd ..

echo "→ Installing frontend dependencies"
cd frontend && npm install && cd ..

echo "→ Creating .env files from examples (edit these with real values before running)"
[ -f backend/.env ] || cp backend/.env.example backend/.env
[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local

echo "→ Setting up database schema (requires DATABASE_URL to be set and reachable)"
psql "$DATABASE_URL" -f backend/db-setup.sql

echo "✅ Setup complete. Edit backend/.env with real secrets, then run the dev servers."

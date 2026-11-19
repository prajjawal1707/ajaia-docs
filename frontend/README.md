# Ajaia Docs — React frontend

A lightweight document workspace UI built with React, Vite, TypeScript and Tiptap.

## Requirements
- Node.js 20+
- A running Ajaia FastAPI backend (see API contract below)

## Run locally
```bash
npm install
# Windows PowerShell: Copy-Item .env.example .env
# macOS/Linux: cp .env.example .env
# Set VITE_API_URL to your backend, e.g. http://localhost:8000/api
npm run dev
```
Open the URL printed by Vite (normally http://localhost:5173).

Build:
```bash
npm run build
npm run preview
```

## Supported user flows
- Demo login using seeded accounts
- List all / owned / shared documents
- Create, open, rename and delete documents
- Rich text: bold, italic, underline, H1/H2, bullet and numbered lists
- Debounced autosave (850ms)
- Import `.txt` and `.md` files up to 2 MB
- Grant viewer/editor access and remove existing shares

## Backend API contract
All routes are prefixed by `/api`. Except demo login, requests use `Authorization: Bearer <access_token>`.

| Method | Route | Expected behavior |
|---|---|---|
| POST | `/auth/demo-login` | body `{ "email": "alex@ajaia.demo" }`; returns `{ "access_token": "...", "user": { "id", "name", "email" } }` |
| GET | `/auth/me` | current user |
| GET | `/documents` | docs visible to current user |
| POST | `/documents` | body `{ "title", "content" }`; creates owned doc |
| GET | `/documents/{id}` | fetch doc after access check |
| PATCH | `/documents/{id}` | body may include `title`, `content`; editor/owner only |
| DELETE | `/documents/{id}` | owner only |
| GET | `/documents/{id}/permissions` | list shares; owner only |
| POST | `/documents/{id}/share` | body `{ "email", "permission": "viewer"|"editor" }`; owner only |
| DELETE | `/documents/{id}/permissions/{user_id}` | owner removes share |
| POST | `/upload` | multipart `file`; imports `.txt` or `.md`, creates doc |

Document JSON shape:
```json
{
  "id": "document-id",
  "title": "Project notes",
  "content": { "type": "doc", "content": [{ "type": "paragraph" }] },
  "owner_id": "user-id",
  "owner_name": "Alex Morgan",
  "permission": "owner",
  "updated_at": "2026-11-19T10:00:00Z"
}
```
`permission` is `owner`, `editor`, or `viewer`. The backend must reject PATCH from viewers and DELETE/share management from non-owners.

## Deployment
Deploy this frontend as a Vercel project:
1. Push this folder to a GitHub repository.
2. Import the repository in Vercel.
3. Set `VITE_API_URL` to the public HTTPS API base, e.g. `https://your-api.onrender.com/api`.
4. Deploy.
5. Configure backend CORS to allow your Vercel domain.

Vercel hosts the frontend only. Deploy the FastAPI backend separately (e.g. Render) and use a persistent PostgreSQL provider for production.

## Notes / intentional scope cuts
This is not real-time multiplayer editing. Two editors may overwrite each other's latest changes; production should add optimistic concurrency/version checks or collaboration using Yjs. Demo login is intended only for evaluation and must not be exposed as production authentication.

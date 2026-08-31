# PadhaiMode

**Focus. Learn. Level Up.**

Full-stack study platform for grades 6–10: accounts, documents marketplace, file uploads, visibility controls, and scored quizzes.

## Stack

- Frontend: HTML, CSS, vanilla JS
- Backend: Node.js 22+ (`node:http` + built-in `node:sqlite`)
- Auth: scrypt password hashes + HMAC JWT
- Files: `uploads/`
- Database: `data/padhai.db` on first run

No npm packages required.

## Run

Needs **Node 22 or newer**.

```bash
npm start
```

Open http://localhost:3000

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | adhrit@padhaimode.app | student123 |
| Educator | priya@padhaimode.app | teacher123 |

## GitHub Actions

This repo uses GitHub Actions for CI, not for hosting.

On every push to `main` (and on pull requests), Actions:

1. Installs Node 22
2. Starts `server.js`
3. Checks `/api/health`, demo login, marketplace, and quizzes

Open the **Actions** tab to watch the run. A green check means the backend booted.

GitHub Actions / GitHub Pages cannot keep a Node server online for users. To put PadhaiMode on the internet, deploy to Railway, Render, Fly.io, or a VPS:

```bash
PORT=3000 JWT_SECRET=a-long-random-string npm start
```

## API

- `POST /api/auth/signup` `POST /api/auth/login` `GET /api/auth/me`
- `GET /api/documents` public marketplace
- `POST /api/documents` upload notes (multipart)
- `GET /api/documents/:id/download`
- `PATCH /api/documents/:id` visibility
- `DELETE /api/documents/:id`
- `GET /api/uploads` my notes + stats
- `GET /api/quizzes` `GET /api/quizzes/:id` `POST /api/quizzes/:id/submit`

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

```bash
npm run dev
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | adhrit@padhaimode.app | student123 |
| Educator | priya@padhaimode.app | teacher123 |

Or create an account from Sign Up.

## API

- `POST /api/auth/signup` `POST /api/auth/login` `GET /api/auth/me`
- `GET /api/documents` public marketplace
- `POST /api/documents` upload notes (multipart)
- `GET /api/documents/:id/download`
- `PATCH /api/documents/:id` visibility
- `DELETE /api/documents/:id`
- `GET /api/uploads` my notes + stats
- `GET /api/quizzes` `GET /api/quizzes/:id` `POST /api/quizzes/:id/submit`

## Deploy

```bash
PORT=3000 JWT_SECRET=a-long-random-string npm start
```

Railway, Render, Fly.io, or a VPS. GitHub Pages cannot run this backend.

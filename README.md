# PadhaiMode

**Focus. Learn. Level Up.**

Study platform for grades 6-10: accounts, documents marketplace, uploads, visibility controls, and scored quizzes.

Designed to match the PadhaiMode product screens and deploy on Vercel.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | adhrit@padhaimode.app | student123 |
| Educator | priya@padhaimode.app | teacher123 |

## Run locally

Needs Node 18+.

```bash
npm start
```

Open http://localhost:3000

## Deploy on Vercel

1. Go to vercel.com and sign in with GitHub.
2. Add New → Project and import `padhai-mode`.
3. Leave the defaults. Framework preset: Other. Output directory: `public`.
4. Add environment variable `JWT_SECRET` = a long random string.
5. Deploy.

Vercel serves `public/` as the website and `api/[...path].js` as the backend.

Hobby plan storage is ephemeral, so demo accounts always work and marketplace notes are seeded on boot.

## Stack

- Frontend: HTML, CSS, vanilla JS in `public/`
- API: Vercel serverless (`api/[...path].js`) plus the same handler for local `npm start`
- Auth: scrypt password hashes + HMAC JWT
- Data: JSON store (file locally, /tmp on Vercel)

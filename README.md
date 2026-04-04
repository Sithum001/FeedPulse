# FeedPulse

FeedPulse is a full-stack feedback management app with:
- A public feedback submission form
- An admin dashboard for reviewing, filtering, updating, deleting, and re-analyzing feedback
- AI-assisted categorization/sentiment/priority/summary using Gemini (with local fallback)

## Tech Stack

- Frontend: Next.js (App Router), React, TypeScript
- Backend: Express, TypeScript, MongoDB (Mongoose)
- AI: Google Gemini API (`@google/generative-ai`)

## Project Structure

```text
throughout/
  backend/    # Express + MongoDB API
  frontend/   # Next.js web app
```

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- MongoDB database (local or Atlas)
- (Optional) Gemini API key for cloud AI analysis

## 1) Install Dependencies

From the workspace root, run:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Note: there is also a root `package.json`, but app runtime dependencies are inside `backend` and `frontend`.

## 2) Configure Environment Variables

Create the following files.

### `backend/.env`

```env
# Server
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority

# Auth
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@feedpulse.com
ADMIN_PASSWORD=admin123

# Gemini (optional if fallback is enabled)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
ENABLE_AI_FALLBACK=true
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 3) Run the App (Two Terminals)

### Terminal 1: Backend

```powershell
cd backend
npm run dev
```

Expected log:
- `MongoDB connected: ...`
- `FeedPulse backend running on http://localhost:4000`

### Terminal 2: Frontend

```powershell
cd frontend
npm run dev
```

Open:
- Public form: http://localhost:3000
- Admin login: http://localhost:3000/login
- Admin dashboard: http://localhost:3000/dashboard
- API health: http://localhost:4000/api/health

## 4) Admin Login

Use the credentials from `backend/.env`:
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

If not set, defaults are:
- `admin@feedpulse.com`
- `admin123`

## API Quick Reference

### Public
- `POST /api/feedback` - Submit feedback
- `GET /api/health` - Health check

### Auth
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token (protected)

### Admin Feedback (Protected)
- `GET /api/feedback`
- `GET /api/feedback/:id`
- `PATCH /api/feedback/:id`
- `DELETE /api/feedback/:id`
- `POST /api/feedback/:id/reanalyze`
- `GET /api/feedback/insights/weekly`
- `GET /api/feedback/insights/stats`

## Available Scripts

### Backend (`backend/package.json`)
- `npm run dev` - Start API with `ts-node`

### Frontend (`frontend/package.json`)
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

### Backend exits on startup

Usually caused by missing or invalid `MONGO_URI`.

Checks:
- Confirm `backend/.env` exists
- Confirm `MONGO_URI` is set and valid
- Confirm Atlas IP/network access is configured
- Confirm DNS/network can resolve your cluster

### CORS errors in browser

Set `FRONTEND_URL` in `backend/.env` to your frontend origin (default `http://localhost:3000`).

### 401 Unauthorized in dashboard

- Log in again from `/login`
- Ensure frontend points to the correct backend via `NEXT_PUBLIC_API_URL`
- Ensure `JWT_SECRET` stays consistent while backend is running

### Gemini AI errors (404/429/quota)

The backend can still work using local fallback analysis when:
- `ENABLE_AI_FALLBACK=true`

For cloud AI results:
- Set valid `GEMINI_API_KEY`
- Use a supported model (`GEMINI_MODEL`)

## Production Notes

- Set strong values for `JWT_SECRET` and admin credentials.
- Restrict backend CORS origin(s) to your deployed frontend URL(s).
- Run frontend using `npm run build` then `npm run start`.
- Add a proper backend production start script/process manager before deployment.


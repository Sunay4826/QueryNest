# QueryNest

QueryNest is a browser-based SQL learning platform where learners solve SQL assignments with live execution, hints, and progress tracking.

## Deliverables
- GitHub Repository: frontend + backend in one repo
- Clear folder structure (`frontend/`, `backend/`, `docs/`)
- `.env.example` files with required variables
- Installation and setup instructions
- Environment variable documentation
- Technology choices explanation
- Data-flow diagram guidance (hand-drawn compulsory)
- Demo checklist (optional)

## Technology Choices
- Runtime/API: Node.js + Express.js
- SQL Sandbox Database: PostgreSQL
- Persistence Database: MongoDB Atlas
- Frontend: React + Vite + SCSS
- SQL Editor: Monaco Editor
- Hint Engine: Gemini/OpenAI API

## Features
- Difficulty-based sections (Easy/Medium/Hard)
- Multi-question navigation (`Q1...Qn`) per section
- SQL execution against assignment-isolated PostgreSQL schemas
- Hint generation with safe fallback
- Login/Signup with JWT authentication
- Save and view user SQL attempts per assignment
- Mobile-responsive UI

## Folder Structure
- `frontend/`: React client and SCSS styles
- `backend/`: Express API, SQL sandbox engine, auth/attempt persistence
- `backend/sql/schema.sql`: PostgreSQL schema for assignment sandbox
- `backend/data/assignments.seed.json`: assignment seed source
- `docs/data-flow-template.md`: labeling guide for hand-drawn data-flow

## Setup Instructions
1. Clone repo and move into project directory.
2. Install dependencies:
   - `npm install`
3. Create env files:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`
4. Fill backend env values (see next section).
5. Seed assignments to PostgreSQL:
   - `npm --workspace backend run seed`
6. Run app:
   - `npm run dev`

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

## Environment Variables
### backend/.env
- `PORT=4000`
- `NODE_ENV=development`
- `DATABASE_URL=...` (PostgreSQL sandbox)
- `MONGODB_URI=...` (MongoDB Atlas persistence)
- `MONGODB_DB=querynest`
- `JWT_SECRET=...` (required)
- `LLM_PROVIDER=gemini|openai`
- `GEMINI_API_KEY=...` / `OPENAI_API_KEY=...`
- `GEMINI_MODEL=gemini-2.0-flash`
- `HINT_FALLBACK=true`
- `FRONTEND_ORIGIN=http://localhost:5173`

### frontend/.env
- `VITE_API_BASE_URL=http://localhost:4000/api`

## Data-Flow Diagram (Compulsory)
Draw this by hand in your submission.

Flow to include:
1. User clicks `Execute Query`.
2. Frontend state captures SQL from Monaco editor.
3. Frontend API call: `POST /api/query/execute`.
4. Backend validates request + SQL safety rules.
5. Backend sets assignment schema context in PostgreSQL.
6. PostgreSQL executes query.
7. Backend returns result or SQL error.
8. Frontend updates state and renders result table.
9. If logged in, frontend calls `POST /api/attempts` to save attempt.
10. Attempt history state refreshes and renders latest attempts.

Also include hint flow:
1. User clicks `Get Hint`.
2. Frontend calls `POST /api/hints`.
3. Backend requests LLM/fallback hint.
4. Frontend updates hint state and displays response.

## Demo Checklist (Optional)
- Assignment section selection (Easy/Medium/Hard)
- Question navigation in section
- Query execution demo
- Hint generation demo
- Login + saved attempt history demo
- Mobile responsive walkthrough

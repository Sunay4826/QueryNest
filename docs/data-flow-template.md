# Data Flow Diagram (Compulsory - Hand Drawn)

Draw this manually and label every step with arrows.

## Execute Query Flow
1. User types SQL in Monaco Editor (`sql` state updates on every change).
2. User clicks `Execute Query`.
3. Frontend sends API call `POST /api/query/execute` with `{ assignmentId, sql }`.
4. Backend validates payload and SQL safety rules.
5. Backend resolves assignment schema from PostgreSQL `assignments` table.
6. Backend sets transaction-local `search_path` to assignment schema.
7. Backend executes SQL on PostgreSQL sandbox.
8. Backend compares actual result vs expected output (if configured).
9. Backend responds with `columns`, `rows`, `rowCount`, `durationMs`, and `evaluation`.
10. Frontend updates result state and renders results table + evaluation feedback.
11. If user is logged in, frontend calls `POST /api/attempts` to store attempt in MongoDB.
12. Frontend refreshes attempt history list (`GET /api/attempts/:assignmentId`).

## Hint Flow
1. User clicks `Get Hint`.
2. Frontend sends `POST /api/hints`.
3. Backend loads assignment context.
4. Backend calls Gemini/OpenAI (or fallback logic when quota exhausted).
5. Backend returns concise non-solution hint.
6. Frontend updates hint state and displays it.

## Auth Flow
1. User submits Signup/Login form.
2. Frontend calls `POST /api/auth/signup` or `POST /api/auth/login`.
3. Backend writes/reads user in MongoDB (`users` collection).
4. Backend returns JWT.
5. Frontend stores JWT and includes `Authorization: Bearer <token>` in protected calls.

## Databases Used
- PostgreSQL: SQL sandbox + assignments metadata.
- MongoDB: user accounts + query attempt history.

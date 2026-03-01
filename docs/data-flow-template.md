# Data Flow Diagram (Compulsory - Hand Drawn)

Draw this manually and label each arrow.

## Execute Query Flow
1. User writes SQL in Monaco editor (frontend `sql` state updates).
2. User clicks `Execute Query`.
3. Frontend calls `POST /api/query/execute` with `{ assignmentId, sql }`.
4. Backend validates payload + SQL safety checks.
5. Backend loads assignment schema from PostgreSQL `assignments` table.
6. Backend sets transaction-local `search_path` to assignment schema.
7. PostgreSQL executes query.
8. Backend returns `{ columns, rows, rowCount }`.
9. Frontend updates result state and renders results table.
10. If user is logged in, frontend calls `POST /api/attempts` to save attempt in MongoDB.
11. Frontend refreshes `GET /api/attempts/:assignmentId` and renders history.

## Hint Flow
1. User clicks `Get Hint`.
2. Frontend calls `POST /api/hints`.
3. Backend loads assignment question from PostgreSQL.
4. Backend requests hint from Gemini/OpenAI.
5. Backend returns concise hint.
6. Frontend updates hint state.

## Auth Flow
1. User submits login/signup form.
2. Frontend calls `POST /api/auth/login` or `POST /api/auth/signup`.
3. Backend reads/writes user in MongoDB (`users` collection).
4. Backend returns JWT.
5. Frontend stores JWT and sends `Authorization` header for protected routes.

## Database Split
- PostgreSQL: SQL sandbox execution and assignment metadata.
- MongoDB: user accounts and query attempt history.

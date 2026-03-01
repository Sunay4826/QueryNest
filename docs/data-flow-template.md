# Data Flow Diagram (Manual Drawing Required)

Use this as a label reference when you hand-draw your diagram for submission.

1. User clicks `Execute Query`
2. Frontend `AssignmentAttemptPage` triggers `POST /api/query/execute`
3. Backend `query` route validates request body
4. Backend `sqlValidation` enforces read-only SQL
5. Backend checks assignment and allowed tables
6. PostgreSQL executes query
7. Backend returns columns + rows or SQL error
8. Frontend updates `Results Panel`

Hint flow:
1. User clicks `Get Hint`
2. Frontend triggers `POST /api/hints`
3. Backend fetches assignment context
4. OpenAI returns concise guidance
5. Frontend renders hint text

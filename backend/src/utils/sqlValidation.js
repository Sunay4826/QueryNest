const FORBIDDEN_SQL_PATTERNS = [
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|comment)\b/i,
  /;/,
  /--/,
  /\/\*/,
  /\bpg_/i,
  /\binformation_schema\b/i,
  /\b[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\b/i
];

export function validateSqlQuery(query) {
  const normalized = query.trim();

  if (!normalized) {
    return { valid: false, reason: 'Query cannot be empty.' };
  }

  if (!/^select\b/i.test(normalized)) {
    return { valid: false, reason: 'Only SELECT queries are allowed.' };
  }

  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        valid: false,
        reason:
          'Query contains unsupported syntax. Use a single safe SELECT statement without comments or semicolons.'
      };
    }
  }

  return { valid: true };
}

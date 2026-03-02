const FORBIDDEN_SQL_PATTERNS = [
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|comment)\b/i,
  /--/,
  /\/\*/,
  /\bpg_/i,
  /\binformation_schema\b/i,
  /\b[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\b/i
];

export function validateSqlQuery(query) {
  const normalized = query.trim();
  const withoutTrailingSemicolon = normalized.replace(/;\s*$/, '');

  if (!normalized) {
    return { valid: false, reason: 'Query cannot be empty.' };
  }

  if (!/^select\b/i.test(withoutTrailingSemicolon)) {
    return { valid: false, reason: 'Only SELECT queries are allowed.' };
  }

  // Allow one trailing semicolon but block multi-statement queries.
  if ((normalized.match(/;/g) || []).length > 1 || /;.+\S/.test(normalized)) {
    return {
      valid: false,
      reason: 'Only one SELECT statement is allowed.'
    };
  }

  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(withoutTrailingSemicolon)) {
      return {
        valid: false,
        reason:
          'Query contains unsupported syntax. Use a single safe SELECT statement without comments.'
      };
    }
  }

  return { valid: true };
}

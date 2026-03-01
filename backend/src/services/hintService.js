import OpenAI from 'openai';
import { pool } from '../config/db.js';
import { createHttpError } from '../middleware/errorHandler.js';

const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const hintFallbackEnabled = process.env.HINT_FALLBACK !== 'false';

const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;
let geminiDiscoveredModels = null;

export async function generateHint({ assignmentId, sql }) {
  const assignmentRes = await pool.query(
    'SELECT title, question, requirements FROM assignments WHERE id = $1 LIMIT 1',
    [assignmentId]
  );

  if (!assignmentRes.rows.length) {
    throw createHttpError(404, 'Assignment not found.');
  }

  const assignment = assignmentRes.rows[0];

  const systemPrompt = [
    'You are an SQL tutor for learners.',
    'Do not provide full final SQL query.',
    'Never provide more than one query fragment of 8 tokens.',
    'Focus on conceptual guidance, mistakes to check, and next action.',
    'Output format:',
    '1) Hint:',
    '2) Next Step:',
    '3) Check Yourself: (one verification question)',
    'Keep total response under 120 words.'
  ].join(' ');

  const userPrompt = `Assignment: ${assignment.title}\nQuestion: ${assignment.question}\nRequirements: ${assignment.requirements || ''}\nStudent SQL: ${sql || 'No query yet'}\nProvide guidance only.`;

  if (provider === 'gemini') {
    if (!geminiApiKey) {
      throw createHttpError(500, 'GEMINI_API_KEY is not configured.', true);
    }
    try {
      const hintText = await generateGeminiHint({
        apiKey: geminiApiKey,
        configuredModel: geminiModel,
        prompt: `${systemPrompt}\n\n${userPrompt}`
      });
      return { hint: hintText, source: 'gemini' };
    } catch (error) {
      if ((error.statusCode === 429 || error.statusCode === 503) && hintFallbackEnabled) {
        return {
          hint: buildFallbackHint({ question: assignment.question, sql }),
          source: 'fallback'
        };
      }
      throw error;
    }
  }

  if (!openai) {
    throw createHttpError(500, 'OPENAI_API_KEY is not configured.', true);
  }

  const completion = await openai.chat.completions.create({
    model: openAiModel,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]
  });

  return {
    hint: completion.choices[0]?.message?.content?.trim() || 'No hint available.',
    source: 'openai'
  };
}

async function generateGeminiHint({ apiKey, configuredModel, prompt }) {
  const candidates = await getGeminiModelCandidates(apiKey, configuredModel);
  let lastError = null;

  for (const model of candidates) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 220
          }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      return (
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim() ||
        'No hint available.'
      );
    }

    const errorBody = await safeJson(response);
    lastError = errorBody;
    const status = errorBody?.error?.status || '';

    if (response.status === 404 || status === 'NOT_FOUND') {
      continue;
    }

    if (response.status === 429 || status === 'RESOURCE_EXHAUSTED') {
      const retryDelay = errorBody?.error?.details
        ?.find((d) => String(d?.['@type'] || '').includes('RetryInfo'))
        ?.retryDelay;
      const waitText = retryDelay ? ` Retry after ${retryDelay}.` : '';
      throw createHttpError(
        429,
        `Gemini quota exceeded.${waitText} Add billing, wait for reset, or use fallback hints.`
      );
    }

    throw createHttpError(500, `Gemini API error: ${JSON.stringify(errorBody)}`);
  }

  throw createHttpError(
    500,
    `Gemini API error: no compatible model found. Last error: ${JSON.stringify(lastError)}`
  );
}

async function getGeminiModelCandidates(apiKey, configuredModel) {
  if (!geminiDiscoveredModels) {
    geminiDiscoveredModels = await discoverGeminiModels(apiKey);
  }

  const preferred = [
    configuredModel,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  return [...new Set([...preferred, ...geminiDiscoveredModels])].filter(Boolean);
}

async function discoverGeminiModels(apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];

  return models
    .filter(
      (m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
    )
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return { error: { message: 'Unknown Gemini error' } };
  }
}

function buildFallbackHint({ question, sql }) {
  const normalizedSql = String(sql || '').trim().toLowerCase();
  const q = String(question || '');

  if (!normalizedSql) {
    return 'Hint: Start with the core table in FROM. Next Step: run a minimal SELECT first. Check Yourself: Are selected columns exactly what output asks?';
  }

  if (!normalizedSql.includes('from')) {
    return 'Hint: FROM clause is missing. Next Step: add FROM with correct table and rerun. Check Yourself: Did you reference the right table name from sample data?';
  }

  if (/\bcount\s*\(/i.test(q) && !/\bgroup\s+by\b/.test(normalizedSql)) {
    return 'Hint: Count questions often need grouping. Next Step: add GROUP BY for the category column. Check Yourself: Does each output row represent one group?';
  }

  if (/\btotal\b|\bsum\b|order value/i.test(q) && !/\bsum\s*\(/.test(normalizedSql)) {
    return 'Hint: Aggregate total using SUM. Next Step: group by entity key/name. Check Yourself: Are duplicate rows collapsing into one row per entity?';
  }

  if (/\bhighest\b|\bmax\b/i.test(q) && !/\bmax\s*\(/.test(normalizedSql)) {
    return 'Hint: Use MAX in a subquery or CTE. Next Step: compare row metric to computed max. Check Yourself: Are ties included when values are equal?';
  }

  return 'Hint: Your structure is close. Next Step: validate filters, joins, and grouping against expected output. Check Yourself: Does row count and column set match exactly?';
}

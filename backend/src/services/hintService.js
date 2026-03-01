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

  const systemPrompt =
    'You are an SQL tutor. Give only guidance and conceptual hints. Never give full final SQL query. Keep response under 120 words.';
  const userPrompt = `Assignment: ${assignment.title}\nQuestion: ${assignment.question}\nRequirements: ${assignment.requirements || ''}\nStudent SQL: ${sql || 'No query yet'}\nProvide one concise hint and one next step.`;

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
      // Keep product usable during API quota/rate outages.
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
    temperature: 0.4,
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
    hint: completion.choices[0]?.message?.content?.trim() || 'No hint available.'
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
            temperature: 0.4,
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
    .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
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
    return `Start with FROM on the main table in this question, then add SELECT columns needed in the output. Next step: write a basic query without filters and run it.`;
  }

  if (!normalizedSql.includes('from')) {
    return `Your query is missing a FROM clause. Next step: identify the table(s) in the sample data and add FROM before adding conditions.`;
  }

  if (/\bcount\s*\(/i.test(q) && !/\bgroup\s+by\b/.test(normalizedSql)) {
    return `For count-by-category problems, group rows by the category column. Next step: add GROUP BY on the department-like column used in your SELECT.`;
  }

  if (/\btotal\b|\bsum\b|order value/i.test(q) && !/\bsum\s*\(/.test(normalizedSql)) {
    return `This question needs aggregation. Next step: use SUM on the amount/value column and group by the entity name (for example customer).`;
  }

  if (/\bhighest\b|\bmax\b/i.test(q) && !/\bmax\s*\(/.test(normalizedSql)) {
    return `Think in two steps: find the maximum value, then match rows equal to that max. Next step: use a subquery with MAX(...) in a WHERE condition.`;
  }

  if (/\border\s+by\b/.test(normalizedSql) === false && /\btop\b|\bhighest\b/i.test(q)) {
    return `You may need ranking/sorting. Next step: add ORDER BY on the key metric in descending order (or compare against MAX).`;
  }

  return `Your structure is close. Next step: verify selected columns, filtering condition, and any required grouping so output matches expected rows exactly.`;
}

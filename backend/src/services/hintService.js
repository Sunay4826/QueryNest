import OpenAI from 'openai';
import { pool } from '../config/db.js';
import { createHttpError } from '../middleware/errorHandler.js';

const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

export async function generateHint({ assignmentId, sql }) {
  const assignmentRes = await pool.query(
    'SELECT title, question FROM assignments WHERE id = $1 LIMIT 1',
    [assignmentId]
  );

  if (!assignmentRes.rows.length) {
    throw createHttpError(404, 'Assignment not found.');
  }

  const assignment = assignmentRes.rows[0];

  const systemPrompt =
    'You are an SQL tutor. Give only hint, not final query. Keep it short: Hint, Next Step, Check Yourself.';
  const userPrompt = `Assignment: ${assignment.title}\nQuestion: ${assignment.question}\nStudent SQL: ${sql || 'No query yet'}`;

  if (provider === 'openai') {
    if (!openai) {
      throw createHttpError(500, 'OPENAI_API_KEY is not configured.', true);
    }

    const completion = await openai.chat.completions.create({
      model: openAiModel,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    return {
      hint: completion.choices[0]?.message?.content?.trim() || 'No hint available.',
      source: 'openai'
    };
  }

  if (!geminiApiKey) {
    throw createHttpError(500, 'GEMINI_API_KEY is not configured.', true);
  }

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 220
    }
  };

  const candidateModels = Array.from(
    new Set([geminiModel, 'gemini-2.0-flash', 'gemini-2.0-flash-lite'])
  );

  let data = null;
  for (const model of candidateModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (response.ok) {
      data = await response.json();
      break;
    }

    await response.text();
    if (response.status === 429) {
      return {
        hint: buildQuotaFallbackHint({ question: assignment.question, sql }),
        source: 'fallback'
      };
    }
    if (response.status !== 404) {
      throw createHttpError(500, 'Hint service is temporarily unavailable. Please try again.');
    }
  }

  if (!data) {
    throw createHttpError(500, 'Hint service is temporarily unavailable. Please try again.');
  }

  return {
    hint:
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim() ||
      'No hint available.',
    source: 'gemini'
  };
}

function buildQuotaFallbackHint({ question, sql }) {
  const q = String(question || '');
  const s = String(sql || '').trim().toLowerCase();

  if (!s) {
    return pickOne([
      'Hint: Start with SELECT + FROM first, then add filtering step by step.',
      'Hint: Begin with a minimal query on the main table, run it, then refine.',
      'Hint: First return raw rows from the main table so you can verify column names.'
    ]);
  }
  if (!s.includes('from')) {
    return pickOne([
      'Hint: Add a FROM clause with the exact table name from sample data.',
      'Hint: Your query needs FROM before conditions/aggregation can work.',
      'Hint: Identify the correct base table and place it in FROM, then run again.'
    ]);
  }
  if ((/\bmore than\b|\bgreater than\b|>\s*\d+/i.test(q) || /\bless than\b|<\s*\d+/i.test(q)) && !/\bwhere\b/.test(s)) {
    return pickOne([
      'Hint: This question needs filtering. Add a WHERE condition based on the threshold.',
      'Hint: You likely need WHERE to keep only matching rows.',
      'Hint: Add WHERE with the value condition from the question text.'
    ]);
  }
  if ((/\beach\b|\bper\b/i.test(q)) && !/\bgroup by\b/.test(s)) {
    return pickOne([
      'Hint: “Each/Per” usually means grouping. Add GROUP BY for the category column.',
      'Hint: Output expects one row per group, so GROUP BY is likely required.',
      'Hint: Group by the entity in output (department/customer/etc.).'
    ]);
  }
  if ((/\border\b|\bsorted\b|\btop\b|\bhighest\b/i.test(q)) && !/\border by\b/.test(s) && !/\bmax\s*\(/.test(s)) {
    return pickOne([
      'Hint: Consider ORDER BY to control result order (often DESC for top/highest).',
      'Hint: Sorting may be required here. Add ORDER BY on the key metric.',
      'Hint: If asking for top/highest, order descending and limit rows if needed.'
    ]);
  }
  if ((/\bcustomer\b/i.test(q) && /\border\b/i.test(q)) && !/\bjoin\b/.test(s)) {
    return pickOne([
      'Hint: This likely needs joining customers and orders tables.',
      'Hint: Combine customer and order data using JOIN on matching IDs.',
      'Hint: Add JOIN before aggregation so names and amounts are available together.'
    ]);
  }
  if ((/\bcount\b/i.test(q) || /\bnumber of\b/i.test(q)) && !/\bgroup by\b/.test(s)) {
    return pickOne([
      'Hint: This looks like an aggregation question. Add GROUP BY on the required category column.',
      'Hint: COUNT with per-category output generally needs GROUP BY.',
      'Hint: Group rows first, then apply COUNT(*).'
    ]);
  }
  if ((/\btotal\b/i.test(q) || /\bsum\b/i.test(q)) && !/\bsum\s*\(/.test(s)) {
    return pickOne([
      'Hint: Use SUM(...) for totals and group rows by the entity required in output.',
      'Hint: Add SUM on amount/value column, then GROUP BY name/category.',
      'Hint: Aggregate numeric values with SUM and return one row per entity.'
    ]);
  }
  if ((/\bhighest\b/i.test(q) || /\bmax\b/i.test(q)) && !/\bmax\s*\(/.test(s)) {
    return pickOne([
      'Hint: Find MAX(...) first, then match rows equal to that value.',
      'Hint: Use MAX in a subquery/CTE and compare the target column against it.',
      'Hint: For highest value tasks, think in two steps: compute max, then filter.'
    ]);
  }

  return pickOne([
    'Hint: Recheck selected columns, filters, and grouping to match expected output.',
    'Hint: Compare your result shape with expected output: columns, row count, and ordering.',
    'Hint: Your query is close; verify join condition/filter logic carefully.'
  ]);
}

function pickOne(options) {
  return options[Math.floor(Math.random() * options.length)];
}

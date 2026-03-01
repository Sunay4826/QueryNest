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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw createHttpError(500, `Hint service error: ${text}`);
  }

  const data = await response.json();
  return {
    hint:
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim() ||
      'No hint available.',
    source: 'gemini'
  };
}

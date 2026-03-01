import { z } from 'zod';

export const assignmentIdSchema = z.object({
  assignmentId: z.coerce.number().int().positive()
});

export const executeQuerySchema = z.object({
  assignmentId: z.number().int().positive(),
  sql: z.string().min(1).max(5000)
});

export const hintSchema = z.object({
  assignmentId: z.number().int().positive(),
  sql: z.string().max(5000).optional().default('')
});

export const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

export const saveAttemptSchema = z.object({
  assignmentId: z.number().int().positive(),
  sql: z.string().min(1).max(5000),
  status: z.enum(['success', 'error']),
  errorMessage: z.string().max(1000).optional().nullable()
});

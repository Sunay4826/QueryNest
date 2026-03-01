import { Router } from 'express';
import { loginSchema, signupSchema } from '../utils/validators.js';
import { login, signup } from '../services/authService.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    const data = await signup(payload);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const data = await login(payload);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

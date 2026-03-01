import { Router } from 'express';
import { hintSchema } from '../utils/validators.js';
import { generateHint } from '../services/hintService.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const payload = hintSchema.parse(req.body);
    const hint = await generateHint(payload);
    res.status(200).json(hint);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { executeQuerySchema } from '../utils/validators.js';
import { executeStudentQuery } from '../services/queryService.js';

const router = Router();

router.post('/execute', async (req, res, next) => {
  try {
    const payload = executeQuerySchema.parse(req.body);
    const data = await executeStudentQuery(payload);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

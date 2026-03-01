import { Router } from 'express';
import { assignmentIdSchema } from '../utils/validators.js';
import {
  getAssignments,
  getAssignmentById
} from '../services/assignmentService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const assignments = await getAssignments();
    res.status(200).json(assignments);
  } catch (error) {
    next(error);
  }
});

router.get('/:assignmentId', async (req, res, next) => {
  try {
    const { assignmentId } = assignmentIdSchema.parse(req.params);
    const assignment = await getAssignmentById(assignmentId);
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
});

export default router;

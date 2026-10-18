import { Router } from 'express';
import {
  createBoard,
  getBoardById,
  updateBoard,
  deleteBoard,
} from '../controllers/board.controller';
import { getBoardActivities } from '../controllers/activity.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/', createBoard);
router.get('/:boardId', getBoardById);
router.patch('/:boardId', updateBoard);
router.delete('/:boardId', deleteBoard);
router.get('/:boardId/activities', getBoardActivities);

export default router;

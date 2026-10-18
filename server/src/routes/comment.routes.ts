import { Router } from 'express';
import { deleteComment } from '../controllers/comment.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.delete('/:commentId', deleteComment);

export default router;

import { Router } from 'express';
import {
  createList,
  updateList,
  deleteList,
} from '../controllers/list.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/', createList);
router.patch('/:listId', updateList);
router.delete('/:listId', deleteList);

export default router;

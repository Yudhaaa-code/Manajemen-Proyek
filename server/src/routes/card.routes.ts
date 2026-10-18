import { Router } from 'express';
import {
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  createLabel,
  deleteLabel,
  createAttachment,
  uploadAttachment,
  deleteAttachment,
} from '../controllers/card.controller';
import { addComment } from '../controllers/comment.controller';
import { authenticateJWT } from '../middleware/auth';
import { upload } from '../lib/upload';

const router = Router();

router.use(authenticateJWT);

// Cards
router.post('/', createCard);
router.patch('/:cardId', updateCard);
router.delete('/:cardId', deleteCard);
router.patch('/:cardId/move', moveCard);
router.post('/:cardId/comments', addComment);

// Subtasks
router.post('/:cardId/subtasks', createSubtask);
router.patch('/subtasks/:subtaskId', updateSubtask);
router.delete('/subtasks/:subtaskId', deleteSubtask);

// Labels
router.post('/:cardId/labels', createLabel);
router.delete('/labels/:labelId', deleteLabel);

// Attachments
router.post('/:cardId/attachments', createAttachment);
router.post('/:cardId/attachments/upload', upload.single('file'), uploadAttachment);
router.delete('/attachments/:attachmentId', deleteAttachment);

export default router;



import { Router } from 'express';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  joinWorkspace,
  inviteMemberByEmail,
  joinWorkspaceByInviteToken,
  updateMemberRole,
  removeMember,
  searchWorkspaceCards,
} from '../controllers/workspace.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);
router.post('/join', joinWorkspace);
router.post('/join-invite', joinWorkspaceByInviteToken);
router.get('/:workspaceId', getWorkspaceById);
router.get('/:workspaceId/search', searchWorkspaceCards);
router.post('/:workspaceId/invites', inviteMemberByEmail);
router.patch('/:workspaceId/members/:memberId/role', updateMemberRole);
router.delete('/:workspaceId/members/:memberId', removeMember);

export default router;


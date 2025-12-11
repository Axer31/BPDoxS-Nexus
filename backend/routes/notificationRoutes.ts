import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.id;
  const notifications = await NotificationService.getUserNotifications(userId);
  res.json(notifications);
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.id;
  await NotificationService.markAsRead(Number(req.params.id), userId);
  res.json({ success: true });
});

router.patch('/read-all', async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.id;
  await NotificationService.markAllRead(userId);
  res.json({ success: true });
});

export default router;
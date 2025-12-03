import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// GET: List Notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user.id;
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH: Mark Single Read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user.id;
    await NotificationService.markAsRead(Number(req.params.id), userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// PATCH: Mark All Read
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user.id;
    await NotificationService.markAllRead(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

// POST: Test Notification (Optional - for debugging)
router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user.id;
    await NotificationService.createNotification(userId, "Test Alert", "This is a manual test notification.", "SUCCESS");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to create test notification" });
  }
});

export default router;
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  
  // Create a notification (Internal Use)
  static async createNotification(userId: number, title: string, message: string, type = 'INFO', link?: string) {
    return await prisma.notification.create({
      data: { user_id: userId, title, message, type, link }
    });
  }

  // Get user's notifications
  static async getUserNotifications(userId: number) {
    return await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50 // Limit to last 50
    });
  }

  // Mark single as read
  static async markAsRead(id: number, userId: number) {
    return await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true }
    });
  }

  // Mark ALL as read
  static async markAllRead(userId: number) {
    return await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true }
    });
  }
}
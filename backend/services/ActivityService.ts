// backend/services/ActivityService.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ActivityService {
  
  // 1. Create Log Entry
  // Added 'timezone' as an optional parameter with a default value to fix the syntax error
  static async log(
    userId: number, 
    action: string, 
    description: string, 
    entityType?: string, 
    entityId?: string, 
    ip?: string,
    timezone: string = "Asia/Kolkata"
  ) {
    try {
      // Clean IP string if it contains multiple comma-separated IPs (x-forwarded-for)
      const cleanIp = ip ? ip.split(',')[0].trim() : 'Unknown';

      await prisma.activityLog.create({
        data: {
          user_id: userId,
          action,
          description,
          entity_type: entityType,
          entity_id: entityId,
          ip_address: cleanIp,
          timezone: timezone // Correctly mapped from the argument
        }
      });
    } catch (error) {
      // Suppress error if DB is not configured, which is expected during the setup process.
      console.error("Failed to log activity (System may be uninitialized):", error);
    }
  }

  // 2. Fetch Logs (No change to logic, just added defensive layer)
  static async getLogs(limit = 100) {
    try {
        return await prisma.activityLog.findMany({
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: { email: true, role: true }
            }
          }
        });
    } catch (error) {
        console.error("Failed to fetch logs:", error);
        return [];
    }
  }

  // 3. Log Rotation (Cleanup) - Added defensive layer for start-up
  static async pruneLogs(daysToKeep = 7) {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);

      const result = await prisma.activityLog.deleteMany({
        where: {
          created_at: {
            lt: dateThreshold
          }
        }
      });
      console.log(`[ActivityService] Pruned ${result.count} logs older than ${daysToKeep} days.`);
    } catch (error) {
      // This is the common error seen on server startup before first-time setup is complete.
      console.log(`[ActivityService] Prune failed (expected if DB is unconfigured): Database initialization required.`);
    }
  }
}
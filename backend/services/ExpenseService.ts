import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExpenseService {
  
  // List all expenses (Newest first)
  // Updated: Accepts optional date range for filtering
  static async getAllExpenses(from?: Date, to?: Date) {
    const whereClause: any = {};

    // Apply date filter if both dates are provided
    if (from && to) {
        whereClause.date = {
            gte: from,
            lte: to
        };
    }

    return await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
  }

  // Create new expense
  static async createExpense(data: any) {
    // FIX: Strict IST Standardization
    // Incoming dates often arrive as "Midnight IST" (e.g. Mar 1, 00:00).
    // In UTC, this is "Feb 29, 18:30".
    // If we just use .getDate(), a UTC server sees "29".
    // 
    // SOLUTION: We add 5.5 Hours (19800000 ms) to the timestamp.
    // "Feb 29 18:30" becomes "Mar 01 00:00".
    // Then we extract the day/month/year and set to UTC Noon.
    
    const rawDate = new Date(data.date);
    
    // 1. Shift Timezone to simulate IST context
    const istOffset = 5.5 * 60 * 60 * 1000; 
    const istDate = new Date(rawDate.getTime() + istOffset);

    // 2. Create Normalized Date (Noon UTC) using the IST components
    const normalizedDate = new Date(Date.UTC(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth(),
      istDate.getUTCDate(),
      12, 0, 0, 0
    ));

    return await prisma.expense.create({
      data: {
        category: data.category,
        amount: data.amount,
        date: normalizedDate, 
        description: data.description
      }
    });
  }

  // Delete expense
  static async deleteExpense(id: number) {
    return await prisma.expense.delete({
      where: { id }
    });
  }
}
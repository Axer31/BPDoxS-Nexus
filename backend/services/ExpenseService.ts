import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExpenseService {
  
  // List all expenses (Newest first)
  static async getAllExpenses() {
    return await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
  }

  // Create new expense
  static async createExpense(data: any) {
    return await prisma.expense.create({
      data: {
        category: data.category,
        amount: data.amount,
        date: new Date(data.date), // Ensure valid Date object
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
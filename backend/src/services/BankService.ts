// backend/src/services/BankService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BankService {
  
  // 1. List all bank accounts
  static async getAllAccounts() {
    // @ts-ignore
    return await prisma.bankAccount.findMany({
      orderBy: { is_default: 'desc' } // Default account always on top
    });
  }

  // 2. Create a new bank account
  static async createAccount(data: any) {
    // If this is set as default, unset others first
    if (data.is_default) {
      // @ts-ignore
      await prisma.bankAccount.updateMany({
        where: { is_default: true },
        data: { is_default: false }
      });
    }

    // @ts-ignore
    return await prisma.bankAccount.create({
      data: {
        label: data.label,
        currency: data.currency,
        bank_name: data.bank_name,
        account_holder: data.account_holder,
        account_number: data.account_number,
        
        // Optional International Fields
        routing_number: data.routing_number,
        swift_code: data.swift_code,
        ifsc_code: data.ifsc_code,
        iban: data.iban,
        sort_code: data.sort_code,
        
        // Address & UPI
        branch_address: data.branch_address,
        beneficiary_address: data.beneficiary_address,
        upi_id: data.upi_id,
        
        is_default: data.is_default || false
      }
    });
  }

  // 3. Update an existing bank account
  static async updateAccount(id: number, data: any) {
    // If setting as default during update, unset others first
    if (data.is_default) {
      // @ts-ignore
      await prisma.bankAccount.updateMany({
        where: { id: { not: id }, is_default: true },
        data: { is_default: false }
      });
    }

    // @ts-ignore
    return await prisma.bankAccount.update({
      where: { id },
      data: {
        label: data.label,
        currency: data.currency,
        bank_name: data.bank_name,
        account_holder: data.account_holder,
        account_number: data.account_number,
        routing_number: data.routing_number,
        swift_code: data.swift_code,
        ifsc_code: data.ifsc_code,
        iban: data.iban,
        sort_code: data.sort_code,
        branch_address: data.branch_address,
        beneficiary_address: data.beneficiary_address,
        upi_id: data.upi_id,
        is_default: data.is_default
      }
    });
  }

  // 4. Set a specific account as Default
  static async setAsDefault(id: number) {
    return await prisma.$transaction(async (tx) => {
      // Unset all
      // @ts-ignore
      await tx.bankAccount.updateMany({
        data: { is_default: false }
      });

      // Set new default
      // @ts-ignore
      return await tx.bankAccount.update({
        where: { id },
        data: { is_default: true }
      });
    });
  }

  // 5. Delete account
  static async deleteAccount(id: number) {
    // @ts-ignore
    return await prisma.bankAccount.delete({
      where: { id }
    });
  }
}
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BankService {
  
  static async getAllAccounts() {
    return await prisma.bankAccount.findMany({
      orderBy: { is_default: 'desc' } 
    });
  }

  static async createAccount(data: any) {
    if (data.is_default) {
      await prisma.bankAccount.updateMany({
        where: { is_default: true },
        data: { is_default: false }
      });
    }

    return await prisma.bankAccount.create({
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
        upi_id: data.upi_id,
        is_default: data.is_default || false
      }
    });
  }

  static async updateAccount(id: number, data: any) {
    if (data.is_default) {
      await prisma.bankAccount.updateMany({
        where: { id: { not: id }, is_default: true },
        data: { is_default: false }
      });
    }

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
        upi_id: data.upi_id,
        is_default: data.is_default
      }
    });
  }

  static async setAsDefault(id: number) {
    return await prisma.$transaction(async (tx) => {
      await tx.bankAccount.updateMany({ data: { is_default: false } });
      return await tx.bankAccount.update({ where: { id }, data: { is_default: true } });
    });
  }

  static async deleteAccount(id: number) {
    return await prisma.bankAccount.delete({ where: { id } });
  }
}
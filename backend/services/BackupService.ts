import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BackupService {
  
  static async exportData() {
    console.log("Starting Backup Export...");

    try {
        // 1. Fetch Data from ALL Tables
        // Using explicit queries to ensure type safety
        const clients = await prisma.client.findMany();
        const invoices = await prisma.invoice.findMany();
        const quotations = await prisma.quotation.findMany();
        const expenses = await prisma.expense.findMany();
        const bankAccounts = await prisma.bankAccount.findMany();
        const settings = await prisma.systemSetting.findMany();
        
        // Sequences
        const invoiceSequences = await prisma.invoiceSequence.findMany();
        const quotationSequences = await prisma.quotationSequence.findMany();

        // Users (Careful with this, but needed for full restore)
        const users = await prisma.user.findMany();

        const backupData = {
          version: "2.0", // Bumped version for the new schema
          timestamp: new Date().toISOString(),
          data: {
            clients,
            invoices,
            quotations,
            expenses,
            bankAccounts,
            settings,
            invoiceSequences,
            quotationSequences,
            users
          }
        };

        // Simple obfuscation (Base64) to prevent accidental edits in text editors.
        // For true security, this file should be stored safely by the user.
        const jsonString = JSON.stringify(backupData);
        const encrypted = Buffer.from(jsonString).toString('base64');

        return encrypted;

    } catch (error) {
        console.error("CRITICAL BACKUP ERROR:", error);
        throw new Error("Backup generation failed");
    }
  }

  static async importData(encryptedData: string) {
    console.log("Starting Backup Restore...");
    
    // 1. Decrypt
    const jsonString = Buffer.from(encryptedData, 'base64').toString('utf-8');
    let parsed;
    
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        throw new Error("Invalid file format. Could not parse backup.");
    }

    if (!parsed.data) throw new Error("Invalid .iec file structure");

    // 2. Transactional Restore (All or Nothing)
    await prisma.$transaction(async (tx) => {
      
      // A. Settings
      if (parsed.data.settings) {
        for (const s of parsed.data.settings) {
          await tx.systemSetting.upsert({
            where: { key: s.key },
            update: { value: s.value, json_value: s.json_value },
            create: { key: s.key, value: s.value, json_value: s.json_value, is_locked: s.is_locked }
          });
        }
      }

      // B. Users (Restore Admin)
      if (parsed.data.users) {
        for (const u of parsed.data.users) {
          await tx.user.upsert({
            where: { email: u.email },
            update: { password_hash: u.password_hash, two_factor_enabled: u.two_factor_enabled, two_factor_secret: u.two_factor_secret },
            create: { ...u, id: undefined } // Let DB handle ID auto-increment or keep consistent if needed
          });
        }
      }

      // C. Core Data (Clients, Banks)
      if (parsed.data.clients) {
        for (const c of parsed.data.clients) {
          await tx.client.upsert({
            where: { id: c.id },
            update: { ...c },
            create: { ...c }
          });
        }
      }

      if (parsed.data.bankAccounts) {
        for (const b of parsed.data.bankAccounts) {
          await tx.bankAccount.upsert({
            where: { id: b.id },
            update: { ...b },
            create: { ...b }
          });
        }
      }

      // D. Transactional Data (Invoices, Quotes, Expenses)
      if (parsed.data.expenses) {
        for (const e of parsed.data.expenses) {
          await tx.expense.upsert({
            where: { id: e.id },
            update: { ...e },
            create: { ...e }
          });
        }
      }

      // Invoices (Unique constraint is invoice_number)
      if (parsed.data.invoices) {
        for (const inv of parsed.data.invoices) {
          await tx.invoice.upsert({
            where: { invoice_number: inv.invoice_number },
            update: { ...inv },
            create: { ...inv }
          });
        }
      }

      // Quotations (Unique constraint is quotation_number)
      if (parsed.data.quotations) {
        for (const q of parsed.data.quotations) {
          await tx.quotation.upsert({
            where: { quotation_number: q.quotation_number },
            update: { ...q },
            create: { ...q }
          });
        }
      }
      
      // E. Sequences
      if (parsed.data.invoiceSequences) {
        for (const seq of parsed.data.invoiceSequences) {
          await tx.invoiceSequence.upsert({
            where: { fiscal_year: seq.fiscal_year },
            update: { last_count: seq.last_count },
            create: { fiscal_year: seq.fiscal_year, last_count: seq.last_count }
          });
        }
      }

      if (parsed.data.quotationSequences) {
        for (const seq of parsed.data.quotationSequences) {
          await tx.quotationSequence.upsert({
            where: { fiscal_year: seq.fiscal_year },
            update: { last_count: seq.last_count },
            create: { fiscal_year: seq.fiscal_year, last_count: seq.last_count }
          });
        }
      }
    });

    return true;
  }
}
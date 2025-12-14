import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------
// REUSING THE LOGIC FROM INVOICE SERVICE
// ---------------------------------------------------------

/**
 * Extracts pure IST components (Day, Month, Year)
 */
function getISTComponents(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');

  return {
    day: day.toString().padStart(2, '0'),
    month: month.toString().padStart(2, '0'),
    year: year.toString(),
  };
}

/**
 * Forces a Date object to "IST Midnight" stored as UTC.
 */
function getISTDateForStorage(date: Date): Date {
  const ist = getISTComponents(date);
  // Force construct UTC Midnight for the intended IST Day
  return new Date(`${ist.year}-${ist.month}-${ist.day}T00:00:00.000Z`);
}

async function main() {
  console.log("🚀 Starting Date Correction Migration...");

  // ------------------------------------------------
  // 1. FIX INVOICES
  // ------------------------------------------------
  const invoices = await prisma.invoice.findMany();
  console.log(`Found ${invoices.length} Invoices to check.`);

  let invoiceCount = 0;

  for (const inv of invoices) {
    const newIssueDate = getISTDateForStorage(inv.issue_date);
    
    let newDueDate: Date | null = null;
    if (inv.due_date) {
        newDueDate = getISTDateForStorage(inv.due_date);
    }

    // Only update if the time value is different (avoids spamming DB)
    if (inv.issue_date.getTime() !== newIssueDate.getTime() || 
       (inv.due_date && newDueDate && inv.due_date.getTime() !== newDueDate.getTime())) {
        
        await prisma.invoice.update({
            where: { id: inv.id },
            data: {
                issue_date: newIssueDate,
                due_date: newDueDate
            }
        });
        invoiceCount++;
        console.log(`✅ Fixed Invoice ${inv.invoice_number}: ${inv.issue_date.toISOString()} -> ${newIssueDate.toISOString()}`);
    }
  }

  // ------------------------------------------------
  // 2. FIX QUOTATIONS
  // ------------------------------------------------
  const quotations = await prisma.quotation.findMany();
  console.log(`\nFound ${quotations.length} Quotations to check.`);

  let quoteCount = 0;

  for (const quote of quotations) {
    const newIssueDate = getISTDateForStorage(quote.issue_date);
    
    let newExpiryDate: Date | null = null;
    if (quote.expiry_date) {
        newExpiryDate = getISTDateForStorage(quote.expiry_date);
    }

    if (quote.issue_date.getTime() !== newIssueDate.getTime()) {
        await prisma.quotation.update({
            where: { id: quote.id },
            data: {
                issue_date: newIssueDate,
                expiry_date: newExpiryDate
            }
        });
        quoteCount++;
        console.log(`✅ Fixed Quotation ${quote.quotation_number}: ${quote.issue_date.toISOString()} -> ${newIssueDate.toISOString()}`);
    }
  }

  console.log("\n------------------------------------------------");
  console.log(`🎉 Migration Complete.`);
  console.log(`Invoices Updated: ${invoiceCount}`);
  console.log(`Quotations Updated: ${quoteCount}`);
  console.log("------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
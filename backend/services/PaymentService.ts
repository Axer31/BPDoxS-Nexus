import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient(); // ideally move this to a singleton config

interface CreatePaymentDTO {
  amount_received: number;
  payment_date: string;
  payment_method?: string;
  reference_no?: string;
  notes?: string;
}

export class PaymentService {
  static async recordPayment(invoiceId: number, data: CreatePaymentDTO) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          invoice_id: invoiceId,
          amount_received: new Decimal(data.amount_received),
          payment_date: new Date(data.payment_date),
          payment_method: data.payment_method,
          reference_no: data.reference_no,
          notes: data.notes
        }
      });

      // 2. Recalculate Invoice Status
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true }
      });

      if (!invoice) throw new Error("Invoice not found");

      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount_received.toNumber(), 0);
      const grandTotal = invoice.grand_total.toNumber();

      let newStatus = 'SENT';
      if (totalPaid >= grandTotal - 0.5) newStatus = 'PAID'; // 0.5 buffer for rounding
      else if (totalPaid > 0) newStatus = 'PARTIAL';

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      });

      return { payment, newStatus };
    });
  }
}
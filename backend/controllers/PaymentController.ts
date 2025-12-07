import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';

export class PaymentController {
  static async addPayment(req: Request, res: Response) {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid Invoice ID" });
      }

      const result = await PaymentService.recordPayment(invoiceId, req.body);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("Payment Error:", error);
      res.status(500).json({ error: error.message || "Failed to record payment" });
    }
  }
}
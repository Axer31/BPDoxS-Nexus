import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();

// POST /api/payments/:invoiceId
// @ts-ignore - Express type inference struggle with static methods sometimes
router.post('/:invoiceId', PaymentController.addPayment);

export default router;
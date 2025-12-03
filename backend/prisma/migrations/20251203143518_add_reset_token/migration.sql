/*
  Warnings:

  - A unique constraint covering the columns `[reset_token]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Invoice_bank_account_id_fkey` ON `invoice`;

-- DropIndex
DROP INDEX `Invoice_client_id_fkey` ON `invoice`;

-- DropIndex
DROP INDEX `Quotation_bank_account_id_fkey` ON `quotation`;

-- DropIndex
DROP INDEX `Quotation_client_id_fkey` ON `quotation`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `reset_token` VARCHAR(191) NULL,
    ADD COLUMN `reset_token_expiry` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_reset_token_key` ON `User`(`reset_token`);

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_bank_account_id_fkey` FOREIGN KEY (`bank_account_id`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_bank_account_id_fkey` FOREIGN KEY (`bank_account_id`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `payment_date` DATETIME(3) NULL;

-- Optional: Backfill existing PAID invoices with their updated_at date so they don't disappear from reports
UPDATE `Invoice` SET `payment_date` = `updated_at` WHERE `status` = 'PAID';
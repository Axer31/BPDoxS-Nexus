-- DropIndex
DROP INDEX `Invoice_client_id_fkey` ON `invoice`;

-- AlterTable
ALTER TABLE `client` ADD COLUMN `contact_person` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `invoice` ADD COLUMN `remarks` TEXT NULL;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `bank_name` VARCHAR(191) NOT NULL,
    `account_holder` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `routing_number` VARCHAR(191) NULL,
    `swift_code` VARCHAR(191) NULL,
    `ifsc_code` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `sort_code` VARCHAR(191) NULL,
    `branch_address` TEXT NULL,
    `beneficiary_address` TEXT NULL,
    `upi_id` VARCHAR(191) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quotation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_number` VARCHAR(191) NOT NULL,
    `client_id` INTEGER NOT NULL,
    `issue_date` DATETIME(3) NOT NULL,
    `expiry_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `line_items` JSON NOT NULL,
    `contract_terms` TEXT NULL,
    `remarks` TEXT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `grand_total` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Quotation_quotation_number_key`(`quotation_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuotationSequence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fiscal_year` VARCHAR(191) NOT NULL,
    `last_count` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `QuotationSequence_fiscal_year_key`(`fiscal_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

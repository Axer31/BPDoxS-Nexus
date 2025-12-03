-- CreateTable
CREATE TABLE `SystemSetting` (
    `key` VARCHAR(50) NOT NULL,
    `value` TEXT NULL,
    `json_value` JSON NULL,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'ADMIN',
    `two_factor_secret` VARCHAR(191) NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `backup_codes` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_person` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `cin` VARCHAR(191) NULL,
    `state_code` INTEGER NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'India',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `addresses` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `bank_name` VARCHAR(191) NOT NULL,
    `account_holder` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `routing_number` VARCHAR(191) NULL,
    `swift_code` VARCHAR(191) NULL,
    `ifsc_code` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `sort_code` VARCHAR(191) NULL,
    `branch_address` TEXT NULL,
    `upi_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(191) NOT NULL,
    `client_id` INTEGER NOT NULL,
    `bank_account_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `issue_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `line_items` JSON NOT NULL,
    `tax_summary` JSON NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `grand_total` DECIMAL(15, 2) NOT NULL,
    `remarks` TEXT NULL,
    `is_manual_entry` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_invoice_number_key`(`invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quotation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_number` VARCHAR(191) NOT NULL,
    `client_id` INTEGER NOT NULL,
    `bank_account_id` INTEGER NULL,
    `issue_date` DATETIME(3) NOT NULL,
    `expiry_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `line_items` JSON NOT NULL,
    `services_offered` TEXT NULL,
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
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceSequence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fiscal_year` VARCHAR(191) NOT NULL,
    `last_count` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `InvoiceSequence_fiscal_year_key`(`fiscal_year`),
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

-- CreateTable
CREATE TABLE `State` (
    `code` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'India',

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Country` (
    `iso_code` VARCHAR(5) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `currency` VARCHAR(50) NULL,
    `phone_code` VARCHAR(10) NULL,

    PRIMARY KEY (`iso_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_bank_account_id_fkey` FOREIGN KEY (`bank_account_id`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_bank_account_id_fkey` FOREIGN KEY (`bank_account_id`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

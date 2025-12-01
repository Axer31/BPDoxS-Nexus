-- DropIndex
DROP INDEX `Invoice_client_id_fkey` ON `invoice`;

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

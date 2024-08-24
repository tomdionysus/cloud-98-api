-- Generated 2024-08-18T05:58:43.233Z

CREATE TABLE `cloud98_event` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`user_id` BIGINT UNSIGNED NULL,
	`organisation_id` BIGINT UNSIGNED NULL,
	`event_type` VARCHAR(64) NOT NULL,
	`event_data` JSON NOT NULL,
	`created_utc` DATETIME NOT NULL
);
CREATE INDEX `idx_cloud98_event_user_id` ON `cloud98_event` (user_id);
CREATE INDEX `idx_cloud98_event_organisation_id` ON `cloud98_event` (organisation_id);
CREATE INDEX `idx_cloud98_event_event_type` ON `cloud98_event` (event_type);
CREATE INDEX `idx_cloud98_event_created_utc` ON `cloud98_event` (created_utc);

CREATE TABLE `compute` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`ip` VARCHAR(15) NOT NULL,
	`mac` VARCHAR(14) NOT NULL,
	`vCPU` SMALLINT UNSIGNED NOT NULL,
	`memoryKB` INTEGER UNSIGNED NOT NULL,
	`storageKB` INTEGER UNSIGNED NOT NULL
);

CREATE FUNCTION `bigid`() RETURNS bigint unsigned NO SQL RETURN (FLOOR(1 + RAND() * POW(2,63)));

CREATE TABLE `organisation` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`name` VARCHAR(128) NOT NULL,
	`description` VARCHAR(256) NOT NULL DEFAULT '',
	`image_id` BIGINT UNSIGNED NULL,
	`status` ENUM('created','verified','hold') NOT NULL DEFAULT 'created'
);

CREATE TABLE `organisation_user` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`organisation_id` BIGINT UNSIGNED NOT NULL,
	`user_id` BIGINT UNSIGNED NOT NULL,
	`roles` VARCHAR(1024) NOT NULL DEFAULT '',
	`isdefault` ENUM('Y','N') NOT NULL DEFAULT 'N'
);
CREATE UNIQUE INDEX `udx_organisation_user_organisation_id_user_id` ON `organisation_user` (organisation_id,user_id);

CREATE TABLE `subnet` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`name` VARCHAR(1024) NOT NULL,
	`cidr` VARCHAR(18) NOT NULL,
	`vpc_id` BIGINT UNSIGNED NOT NULL,
	`organisation_id` BIGINT UNSIGNED NOT NULL
);
CREATE INDEX `idx_subnet_vpc_id` ON `subnet` (vpc_id);
CREATE INDEX `idx_subnet_organisation_id` ON `subnet` (organisation_id);

CREATE TABLE `user` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`image_id` BIGINT UNSIGNED NULL,
	`first_name` VARCHAR(128) NOT NULL,
	`last_name` VARCHAR(128) NOT NULL,
	`email` VARCHAR(128) NOT NULL,
	`phone` VARCHAR(32) NULL,
	`country` CHAR(2) NOT NULL DEFAULT 'NZ',
	`salt` CHAR(128) NOT NULL,
	`pwdsha256` CHAR(64) NOT NULL,
	`email_confirmed` ENUM('Y','N') NOT NULL DEFAULT 'N',
	`email_confirm_code` CHAR(64) NULL,
	`password_reset_code` CHAR(64) NULL,
	`last_signin_at` DATETIME NULL,
	`email_unsubscribed` ENUM('Y','N') NOT NULL DEFAULT 'N',
	`refresh_token` CHAR(128) NULL,
	`refresh_token_expiry_utc` DATETIME NULL
);
CREATE INDEX `idx_user_email_email_confirmed` ON `user` (email,email_confirmed);
CREATE INDEX `idx_user_email_confirm_code` ON `user` (email_confirm_code);
CREATE INDEX `idx_user_password_reset_code` ON `user` (password_reset_code);
CREATE UNIQUE INDEX `udx_user_email` ON `user` (email);

CREATE TABLE `vpc` (
	`id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
	`name` VARCHAR(1024) NOT NULL,
	`cidr` VARCHAR(18) NOT NULL,
	`organisation_id` BIGINT UNSIGNED NOT NULL
);
CREATE INDEX `idx_vpc_cidr` ON `vpc` (cidr);
CREATE INDEX `idx_vpc_organisation_id` ON `vpc` (organisation_id);
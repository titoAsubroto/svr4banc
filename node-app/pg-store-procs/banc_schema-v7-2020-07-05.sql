-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema banc_db
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `banc_db` ;

-- -----------------------------------------------------
-- Schema banc_db
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `banc_db` DEFAULT CHARACTER SET utf8 ;
SHOW WARNINGS;
USE `banc_db` ;

-- -----------------------------------------------------
-- Table `banc_db`.`person`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`person` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`person` (
  `entity_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `firstname` VARCHAR(32) NOT NULL,
  `lastname` VARCHAR(64) NOT NULL,
  `middlename` VARCHAR(32) NULL,
  `email` VARCHAR(60) NULL,
  `prime` TINYINT(1) NOT NULL,
  `dependent` TINYINT(1) NOT NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `affiliationId` VARCHAR(15) NULL,
  `telephone` VARCHAR(15) NULL,
  `mobile` VARCHAR(15) NULL,
  `isMinor` TINYINT(1) NULL,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `PERSON_INDX` ON `banc_db`.`person` (`firstname` ASC, `lastname` ASC, `email` ASC, `middlename` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`event`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`event` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`event` (
  `entity_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `eventname` VARCHAR(64) NOT NULL,
  `venue` VARCHAR(100) NULL,
  `event_year` YEAR(4) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`address`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`address` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`address` (
  `entity_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `street` VARCHAR(100) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `address2` VARCHAR(100) NULL,
  `state` VARCHAR(50) NOT NULL,
  `zip` VARCHAR(12) NOT NULL,
  `country` VARCHAR(45) NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `addrUNQ` ON `banc_db`.`address` (`street` ASC, `city` ASC, `zip` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`familyCommunication`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`familyCommunication` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`familyCommunication` (
  `entity_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(100) NOT NULL,
  `telephone` VARCHAR(15) NOT NULL,
  `mobile` VARCHAR(15) NULL,
  `update_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `CommUNQ` ON `banc_db`.`familyCommunication` (`email` ASC, `telephone` ASC, `mobile` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`transaction_link`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`transaction_link` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`transaction_link` (
  `link_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `entity1_id` BIGINT(20) NOT NULL,
  `entity2_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `entity1` VARCHAR(45) NOT NULL,
  `entity2` VARCHAR(45) NOT NULL,
  `additional_info` VARCHAR(150) NULL,
  `form_ref` VARCHAR(100) NOT NULL,
  `txn_form_date` DATETIME NOT NULL,
  PRIMARY KEY (`link_id`))
ENGINE = InnoDB;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`transaction`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`transaction` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`transaction` (
  `entity_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `amount` FLOAT NOT NULL,
  `service_fee_paid` FLOAT NOT NULL,
  `amount_net` FLOAT NOT NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `form_date_utc` DATETIME NOT NULL,
  `form_memo` VARCHAR(100) NULL,
  `form_ref` VARCHAR(100) NOT NULL,
  `bank_transaction_memo` VARCHAR(100) NULL,
  `bank_transaction_ref` VARCHAR(50) NULL,
  `bank_transaction_date_utc` DATETIME NULL,
  `inbound` TINYINT(1) NOT NULL,
  `transaction_type_id` BIGINT(20) NOT NULL,
  `summary` TINYINT(1) NOT NULL,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`organization`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`organization` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`organization` (
  `entity_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(32) NOT NULL,
  `organizationId` VARCHAR(12) NOT NULL,
  `orgname` VARCHAR(100) NOT NULL,
  `owner` VARCHAR(100) NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `ORG_INDX` ON `banc_db`.`organization` (`type` ASC, `organizationId` ASC, `orgname` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`link_type`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`link_type` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`link_type` (
  `type_id` BIGINT(20) NOT NULL,
  `type_name` VARCHAR(50) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`type_id`))
ENGINE = InnoDB;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`association_link`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`association_link` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`association_link` (
  `link_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `entity1_id` BIGINT(20) NOT NULL,
  `entity1` VARCHAR(45) NOT NULL,
  `entity2_id` BIGINT(20) NOT NULL,
  `entity2` VARCHAR(45) NOT NULL,
  `name` VARCHAR(150) NULL,
  `update_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `link_type_id` BIGINT(20) NOT NULL,
  `additional_info` VARCHAR(150) NULL,
  `adult_count` INT NULL,
  `guest_count` INT NULL,
  `child_count` INT NULL,
  PRIMARY KEY (`link_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE INDEX `fk_association_link_asociation_type1_idx` ON `banc_db`.`association_link` (`link_type_id` ASC) VISIBLE;

SHOW WARNINGS;
CREATE UNIQUE INDEX `association_uniq` ON `banc_db`.`association_link` (`entity1_id` ASC, `entity2_id` ASC, `link_type_id` ASC, `entity1` ASC, `entity2` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`entity_link_info`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`entity_link_info` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`entity_link_info` (
  `id_key` BIGINT(20) NOT NULL,
  `table_name` VARCHAR(60) NOT NULL,
  `name` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_key`))
ENGINE = InnoDB;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`banc_community`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`banc_community` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`banc_community` (
  `entity_id` BIGINT(20) NOT NULL,
  `ismember` TINYINT(1) NOT NULL,
  `affiliation` VARCHAR(45) NOT NULL,
  `mapping_string` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`entity_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `affiliationUNQ` ON `banc_db`.`banc_community` (`ismember` ASC, `affiliation` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`community_link`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`community_link` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`community_link` (
  `link_id` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `entity1_id` BIGINT(20) NOT NULL,
  `entity2_id` BIGINT(20) NOT NULL,
  `name` VARCHAR(24) NULL,
  `renewal_date` DATETIME NOT NULL,
  `year` YEAR NOT NULL,
  `entity1` VARCHAR(45) NOT NULL,
  `entity2` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`link_id`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `yearly_affiliation_unique` ON `banc_db`.`community_link` (`entity1_id` ASC, `entity2_id` ASC, `name` ASC, `year` ASC, `entity1` ASC, `entity2` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`transaction_type`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`transaction_type` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`transaction_type` (
  `type_id` BIGINT(20) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `subcategory` VARCHAR(50) NOT NULL,
  `line_item` VARCHAR(50) NOT NULL,
  `mapping_string` VARCHAR(250) NOT NULL,
  PRIMARY KEY (`type_id`))
ENGINE = InnoDB;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`creds`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`creds` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`creds` (
  `id_key` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(45) NOT NULL,
  `md5Passwd` VARCHAR(45) NOT NULL,
  `update_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email` VARCHAR(60) NOT NULL,
  `primeid` BIGINT(20) NOT NULL,
  `personid` BIGINT(20) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  PRIMARY KEY (`id_key`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `creds_index` ON `banc_db`.`creds` (`uid` ASC, `email` ASC, `mobile` ASC) VISIBLE;

SHOW WARNINGS;

-- -----------------------------------------------------
-- Table `banc_db`.`sessiontoken`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `banc_db`.`sessiontoken` ;

SHOW WARNINGS;
CREATE TABLE IF NOT EXISTS `banc_db`.`sessiontoken` (
  `id_key` BIGINT(20) NOT NULL AUTO_INCREMENT,
  `uid` VARCHAR(45) NOT NULL,
  `valid_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email` VARCHAR(60) NOT NULL,
  `token` VARCHAR(45) NULL,
  `primeid` BIGINT(20) NULL,
  `personid` BIGINT(20) NULL,
  `mobile` VARCHAR(15) NULL,
  `otptoken` INT(11) NULL,
  PRIMARY KEY (`id_key`))
ENGINE = InnoDB;

SHOW WARNINGS;
CREATE UNIQUE INDEX `stoken_index` ON `banc_db`.`sessiontoken` (`uid` ASC, `email` ASC) VISIBLE;

SHOW WARNINGS;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- -----------------------------------------------------
-- Data for table `banc_db`.`event`
-- -----------------------------------------------------
START TRANSACTION;
USE `banc_db`;
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2019100, 'Swaraswati Puja', 'HSNC Temple', 2019, '2019-02-10', '2019-02-10');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2019200, 'Holi', 'Park', 2019, '2019-04-10', '2019-04-10');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2019300, 'Rabindra Nazrul Jayanti', 'School', 2019, '2019-05-15', '2019-05-15');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2019400, 'Picnic', 'Crabtree-Beech Shelter', 2019, '2019-08-24', '2019-08-24');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2019500, 'Indian Independence Celebration', 'HSNC Temple', 2019, '2019-08-17', '2019-08-17');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2019600, 'Durga Puja', 'Chapel Hill High School', 2019, '2019-09-27', '2019-09-29');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2020100, 'Swaraswati Puja', 'HSNC Temple', 2020, '2020-02-10', '2020-02-10');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2020200, 'Holi', 'Park', 2020, '2020-02-11', '2020-02-11');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2020300, 'Rabindra Nazrul Jayanti', 'School', 2020, '2020-02-12', '2020-02-12');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2020400, 'Picnic', 'Crabtree-Beech Shelter', 2020, '2020-02-13', '2020-02-13');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2020500, 'Indian Independence Celebration', 'HSNC Temple', 2020, '2020-02-14', '2020-02-14');
INSERT INTO `banc_db`.`event` (`entity_id`, `eventname`, `venue`, `event_year`, `start_date`, `end_date`) VALUES (2020600, 'Durga Puja', 'Chapel Hill High School', 2020, '2020-10-15', '2020-10-17');

COMMIT;


-- -----------------------------------------------------
-- Data for table `banc_db`.`organization`
-- -----------------------------------------------------
START TRANSACTION;
USE `banc_db`;
INSERT INTO `banc_db`.`organization` (`entity_id`, `type`, `organizationId`, `orgname`, `owner`, `update_date`) VALUES (100, 'NonProfit-503C3', 'BANCinRDU', 'Bengali Association of North Carolina', '', NULL);

COMMIT;


-- -----------------------------------------------------
-- Data for table `banc_db`.`link_type`
-- -----------------------------------------------------
START TRANSACTION;
USE `banc_db`;
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (100, 'parent', 'child');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (200, 'spouse', 'spouse');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (300, 'member', 'participates-as-member');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (400, 'address', 'address of');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (500, 'communication', 'primary_communication');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (600, 'guest', 'registered-member-guest');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (700, 'non-member', 'registered-nonmember-adult');
INSERT INTO `banc_db`.`link_type` (`type_id`, `type_name`, `display_name`) VALUES (710, 'non-member-child', 'registered-nonmember-child');

COMMIT;


-- -----------------------------------------------------
-- Data for table `banc_db`.`entity_link_info`
-- -----------------------------------------------------
START TRANSACTION;
USE `banc_db`;
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (100, 'banc_db.address', 'address');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (200, 'banc_db.association_link', 'association');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (300, 'banc_db.event', 'event');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (400, 'banc_db.familyCommunication', 'connunication');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (500, 'banc_db.banc_community', 'community');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (600, 'banc_db.transactions', 'transactions');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (700, 'banc_db.person', 'person');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (800, 'banc_db.organizations', 'organizations');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (900, 'banc_db.relationship_link', 'relationship');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (1000, 'banc_db.transaction_link', 'transaction');
INSERT INTO `banc_db`.`entity_link_info` (`id_key`, `table_name`, `name`) VALUES (1100, 'banc_db.community_link', 'affiliation');

COMMIT;


-- -----------------------------------------------------
-- Data for table `banc_db`.`banc_community`
-- -----------------------------------------------------
START TRANSACTION;
USE `banc_db`;
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1010, 1, 'Family-member', 'Family-member|Family/Couple|Already Paid');
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1020, 1, 'Single-member', 'Single-member|Single-');
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1030, 1, 'Student-member', 'Student');
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1040, 0, 'Non-member', 'Non-member|Not A Member');
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1050, 0, 'Non-member-child', 'Non-member-child');
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1060, 0, 'Member-guest', 'Member Guest');
INSERT INTO `banc_db`.`banc_community` (`entity_id`, `ismember`, `affiliation`, `mapping_string`) VALUES (1070, 0, 'Senior-non-member', 'Senior non-member');

COMMIT;


-- -----------------------------------------------------
-- Data for table `banc_db`.`transaction_type`
-- -----------------------------------------------------
START TRANSACTION;
USE `banc_db`;
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (1, 'BANC', 'membership', 'Family-member', 'Family-member|Family/Couple|Already Paid');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (2, 'BANC', 'membership', 'Single-member', 'Single-member|Single-');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (3, 'BANC', 'membership', 'Non-member', 'Non-member|Not A Member');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (4, 'BANC', 'special', 'Default', '');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (200, 'event', 'subscription', 'Non-member', 'Non-member');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (201, 'event', 'subscription', 'Family-member', 'SP Dues|Family-member|Member Family/Couple');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (202, 'event', 'subscription', 'Single-member', 'SP Dues|Single-member|Member Single');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (203, 'event', 'subscription', 'Non-member-adult-3-day', '3 Days/Non-member Adult');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (204, 'event', 'subscription', 'Non-member-child-3-day', 'Non-member Child/1 or 3 day');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (205, 'event', 'subscription', 'Non-member-adult-1-day', '1 Day/Non-member Adult');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (206, 'event', 'subscription', 'Non-member-child-1-day', 'Non-member Child/1 or 3 day');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (207, 'event', 'subscription', 'Non-member-adult-ashtami', 'Ashtami Special/Non-member Adult');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (208, 'event', 'subscription', 'Non-member-child-ashtami', 'Ashtami Special/Non-member Child');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (209, 'event', 'subscription', 'Senior-3-day', '3 days/Senior');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (210, 'event', 'subscription', 'Senior-1-day', '1 days/Senior');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (211, 'event', 'subscription', 'Senior-ashtami', 'Ashtami Special/Senior');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (212, 'event', 'subscription', 'Student-3-day', '3 days/Student');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (213, 'event', 'subscription', 'Student-1-day', '1 day/Student');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (214, 'event', 'subscription', 'Student-ashtami', 'Ashtami Special/Student');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (215, 'event', 'subscription', 'Member-guest-3-day', '3 days/Member\'s Guest|3 days/Member Guest');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (216, 'event', 'subscription', 'Member-guest-1-day', '1 days/Member\'s Guest|1 days/Member Guest');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (217, 'event', 'subscription', 'Member-guest-ashtami', 'Ashtami Special/Member\'s Guest|Ashtami Special/Member Guest');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (218, 'event', 'subscription', 'Summary-line', 'Member');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (219, 'event', 'advertisement', 'Vendor', 'Business Greetings');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (220, 'event', 'advertisement', 'Diganta/Affiliates', 'Personal Greetings');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (221, 'event', 'receipt', 'Stall-rental', 'stall|booth|rent from vendor');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (222, 'event', 'receipt', 'Donation-for-food', 'Food donation|donate');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (223, 'event', 'receipt', 'Donation-for-Puja', 'Puja donation|donate');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (224, 'event', 'receipt', 'Misc-donation', 'Donate to BANC');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (225, 'event', 'receipt', 'Misc', '');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (226, 'event', 'expense', 'Food', 'Food|Catering|Snack');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (227, 'event', 'expense', 'Puja', 'Puja ');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (228, 'event', 'expense', 'Transportation', 'U-haul|Uhaul|Uber|Van rental');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (229, 'event', 'expense', 'Decoration', 'Flowers');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (230, 'event', 'expense', 'Venue-Rental', 'School rental|hall rental|park rental');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (231, 'event', 'expense', 'Cultural-Functions', 'Stage support|');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (232, 'event', 'expense', 'External-Artists', 'Singer|Foreign artist|');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (233, 'event', 'expense', 'Light-Sound-Video Equipment', 'Sound rental|Video rental|Light');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (234, 'event', 'expense', 'Stage-setup', 'Constumes|Stage props');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (235, 'event', 'expense', 'Misc', '');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (236, 'event', 'special', 'Default', '');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (500, 'Paypal', 'payment', 'Payment-refund', 'Payment Refund');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (501, 'Paypal', 'receipt', 'General-withdrawal', 'General Withdrawal');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (502, 'Paypal', 'receipt', 'Summary-line/Receipt', 'Donation|Website|Paypal');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (503, 'Paypal', 'expense', 'Bill User Payment', 'PreApproved Payment Bill');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (504, 'Paypal', 'payment', 'Subscription Payment', 'Subscription Payment');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (505, 'Paypal', 'receipt', 'Summary-to-Sub-line', 'Shopping');
INSERT INTO `banc_db`.`transaction_type` (`type_id`, `category`, `subcategory`, `line_item`, `mapping_string`) VALUES (506, 'Paypal', 'special', 'Default', '');

COMMIT;


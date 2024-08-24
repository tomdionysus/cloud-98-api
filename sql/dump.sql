-- MySQL dump 10.13  Distrib 8.3.0, for macos12.6 (x86_64)
--
-- Host: localhost    Database: cloud98
-- ------------------------------------------------------
-- Server version	8.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cloud98_event`
--

DROP TABLE IF EXISTS `cloud98_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cloud98_event` (
  `id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `organisation_id` bigint unsigned DEFAULT NULL,
  `event_type` varchar(64) NOT NULL,
  `event_data` json NOT NULL,
  `created_utc` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cloud98_event_user_id` (`user_id`),
  KEY `idx_cloud98_event_organisation_id` (`organisation_id`),
  KEY `idx_cloud98_event_event_type` (`event_type`),
  KEY `idx_cloud98_event_created_utc` (`created_utc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cloud98_event`
--

LOCK TABLES `cloud98_event` WRITE;
/*!40000 ALTER TABLE `cloud98_event` DISABLE KEYS */;
INSERT INTO `cloud98_event` VALUES (10200035928760835608,16231354357899152770,1010542858649251200,'subnet.updated','{\"subnet\": {\"id\": \"8771376945287447552\", \"name\": \"BR Main Public\", \"organisation_id\": \"1010542858649251200\"}}','2024-08-18 00:49:35');
/*!40000 ALTER TABLE `cloud98_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organisation`
--

DROP TABLE IF EXISTS `organisation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation` (
  `id` bigint unsigned NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(256) NOT NULL DEFAULT '',
  `image_id` bigint unsigned DEFAULT NULL,
  `status` enum('created','verified','hold') NOT NULL DEFAULT 'created',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organisation`
--

LOCK TABLES `organisation` WRITE;
/*!40000 ALTER TABLE `organisation` DISABLE KEYS */;
INSERT INTO `organisation` VALUES (1010542858649251200,'BlackRaven','BlackRaven Limited',NULL,'verified');
/*!40000 ALTER TABLE `organisation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organisation_user`
--

DROP TABLE IF EXISTS `organisation_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation_user` (
  `id` bigint unsigned NOT NULL,
  `organisation_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `roles` varchar(1024) NOT NULL DEFAULT '',
  `isdefault` enum('Y','N') NOT NULL DEFAULT 'N',
  PRIMARY KEY (`id`),
  UNIQUE KEY `udx_organisation_user_organisation_id_user_id` (`organisation_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organisation_user`
--

LOCK TABLES `organisation_user` WRITE;
/*!40000 ALTER TABLE `organisation_user` DISABLE KEYS */;
INSERT INTO `organisation_user` VALUES (8214856488670470144,1010542858649251200,16231354357899152770,'admin','Y');
/*!40000 ALTER TABLE `organisation_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subnet`
--

DROP TABLE IF EXISTS `subnet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subnet` (
  `id` bigint unsigned NOT NULL,
  `name` varchar(1024) NOT NULL,
  `cidr` varchar(18) NOT NULL,
  `vpc_id` bigint unsigned NOT NULL,
  `organisation_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_subnet_vpc_id` (`vpc_id`),
  KEY `idx_subnet_organisation_id` (`organisation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subnet`
--

LOCK TABLES `subnet` WRITE;
/*!40000 ALTER TABLE `subnet` DISABLE KEYS */;
INSERT INTO `subnet` VALUES (8771376945287447552,'BR Main Public','10.1.0.0/16',1149166003453337984,1010542858649251200);
/*!40000 ALTER TABLE `subnet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` bigint unsigned NOT NULL,
  `image_id` bigint unsigned DEFAULT NULL,
  `first_name` varchar(128) NOT NULL,
  `last_name` varchar(128) NOT NULL,
  `email` varchar(128) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `country` char(2) NOT NULL DEFAULT 'NZ',
  `salt` char(128) NOT NULL,
  `pwdsha256` char(64) NOT NULL,
  `email_confirmed` enum('Y','N') NOT NULL DEFAULT 'N',
  `email_confirm_code` char(64) DEFAULT NULL,
  `password_reset_code` char(64) DEFAULT NULL,
  `last_signin_at` datetime DEFAULT NULL,
  `email_unsubscribed` enum('Y','N') NOT NULL DEFAULT 'N',
  `refresh_token` char(128) DEFAULT NULL,
  `refresh_token_expiry_utc` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `udx_user_email` (`email`),
  KEY `idx_user_email_email_confirmed` (`email`,`email_confirmed`),
  KEY `idx_user_email_confirm_code` (`email_confirm_code`),
  KEY `idx_user_password_reset_code` (`password_reset_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (16231354357899152770,NULL,'Tom','Cully','tomhughcully@gmail.com',NULL,'NZ','bc37ebea1b083121f694548527772df689d2f8ae3031f294bdbdac1ade97cd9da89ada2190f125fb2689f5e53638684486287420f7d89764ec3bb00c699da20f','d2d14e639dd2b2d1685c95acc9809f7617f85e44c0d8efdaf66176661c2dc030','Y',NULL,NULL,'2024-08-18 16:19:14','N','75b8d4af82ee077dda0e18058fbceac909c870f3bd4edca8f9a231f12f91884d8c171ea365f7e0fb280fa61763e96ca815118b9432909b05deefe2a3f72b0e97','2024-08-25 16:19:14');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vpc`
--

DROP TABLE IF EXISTS `vpc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vpc` (
  `id` bigint unsigned NOT NULL,
  `name` varchar(1024) NOT NULL,
  `cidr` varchar(18) NOT NULL,
  `organisation_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vpc_cidr` (`cidr`),
  KEY `idx_vpc_organisation_id` (`organisation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vpc`
--

LOCK TABLES `vpc` WRITE;
/*!40000 ALTER TABLE `vpc` DISABLE KEYS */;
INSERT INTO `vpc` VALUES (1149166003453337984,'BR Demo Cloud','10.0.0.0/8',1010542858649251200),(3515898852125961728,'BR Not Cloud','10.0.0.0/8',1010542858649123);
/*!40000 ALTER TABLE `vpc` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-08-18 17:58:43

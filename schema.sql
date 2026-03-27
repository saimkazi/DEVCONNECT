-- DevConnect — run this once to set up the database
-- mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS devconnect CHARACTER SET utf8mb4;
USE devconnect;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cvs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  full_name   VARCHAR(150) NOT NULL,
  education   VARCHAR(255),
  description TEXT,
  github      VARCHAR(255),
  portfolio   VARCHAR(255),
  linkedin    VARCHAR(255),
  is_public   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY one_cv_per_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Skills are just stored as plain text strings — simple!
CREATE TABLE IF NOT EXISTS cv_skills (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cv_id      INT NOT NULL,
  skill_name VARCHAR(60) NOT NULL,
  FOREIGN KEY (cv_id) REFERENCES cvs(id) ON DELETE CASCADE
);

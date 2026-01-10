-- =========================
-- DATABASE: jeetowin
-- =========================

CREATE DATABASE IF NOT EXISTS jeetowin;
USE jeetowin;

-- =========================
-- ROLES
-- =========================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES
('client'),
('partner'),
('admin'),
('manager'),
('support');

-- =========================
-- USERS (AUTH BASE)
-- =========================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- =========================
-- PARTNERS / IB
-- =========================
CREATE TABLE partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    referral_code VARCHAR(50) UNIQUE,
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================
-- CLIENTS
-- =========================
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partner_id INT NULL,
    full_name VARCHAR(150) NULL,
    mobile VARCHAR(20) NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('active', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (partner_id) REFERENCES partners(id)
);

-- =========================
-- TRANSACTIONS
-- =========================
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    type ENUM('deposit', 'withdrawal', 'trade') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- =========================
-- REFERRALS (COMMISSIONS)
-- =========================
CREATE TABLE referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partner_id INT NOT NULL,
    client_id INT NOT NULL,
    commission_earned DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- =========================
-- AUDIT LOGS (SECURITY)
-- =========================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

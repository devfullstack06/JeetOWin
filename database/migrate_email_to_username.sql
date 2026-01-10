-- Migration script to change email column to username and fix status type
-- Run this if your database has the old schema with 'email' column

USE jeetowin;

-- Step 1: Add username column (if it doesn't exist)
-- First check if username column exists, if not, we need to migrate data
-- Since MySQL doesn't support IF NOT EXISTS in ALTER TABLE, we'll use a procedure approach
-- OR manually run: ALTER TABLE users ADD COLUMN username VARCHAR(150) NULL AFTER email;

-- Step 2: Copy data from email to username (for existing users)
UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL;

-- Step 3: Make username NOT NULL and UNIQUE (after data migration)
ALTER TABLE users MODIFY COLUMN username VARCHAR(150) NOT NULL;
ALTER TABLE users ADD UNIQUE KEY username_unique (username);

-- Step 4: Optionally drop email column (if you want to remove it completely)
-- ALTER TABLE users DROP COLUMN email;

-- Step 5: Fix status column type from VARCHAR to ENUM
-- First, ensure all status values are valid
UPDATE users SET status = 'active' WHERE status NOT IN ('active', 'suspended') OR status IS NULL;
UPDATE users SET status = 'active' WHERE status = '';

-- Change status column type to ENUM
ALTER TABLE users MODIFY COLUMN status ENUM('active', 'suspended') DEFAULT 'active';

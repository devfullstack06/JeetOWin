-- Migration script to add missing columns to existing database
-- Run this if your database was created before the schema updates
-- Note: This will fail if columns already exist - that's OK, just skip those statements

USE jeetowin;

-- Add status column to users table (will fail if column already exists - safe to ignore)
ALTER TABLE users 
ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active';

-- Add full_name column to clients table (will fail if column already exists - safe to ignore)
ALTER TABLE clients 
ADD COLUMN full_name VARCHAR(150) NULL;

-- Add mobile column to clients table (will fail if column already exists - safe to ignore)
ALTER TABLE clients 
ADD COLUMN mobile VARCHAR(20) NULL;

-- Update existing users to have status 'active' if status is NULL
UPDATE users SET status = 'active' WHERE status IS NULL;

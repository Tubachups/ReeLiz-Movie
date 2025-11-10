-- Database setup for ReeLiz Movie Booking System
-- Run this in your XAMPP phpMyAdmin SQL tab

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS reeliz_db;
USE reeliz_db;

-- Drop existing table if it exists to recreate with proper auto-increment
DROP TABLE IF EXISTS transaction;

-- Create transaction table with AUTO_INCREMENT starting from 1
CREATE TABLE transaction (
    id INT NOT NULL AUTO_INCREMENT,
    date VARCHAR(20) NOT NULL COMMENT 'Format: MM/DD:HH',
    name VARCHAR(255) NOT NULL COMMENT 'Username from session',
    room VARCHAR(10) NOT NULL COMMENT 'Cinema room number (1 or 2)',
    movie VARCHAR(255) NOT NULL COMMENT 'Movie title',
    sits TEXT NOT NULL COMMENT 'All selected seats (e.g., A1, A2, B3)',
    amount VARCHAR(20) NOT NULL COMMENT 'Total price in pesos (stored as string)',
    barcode VARCHAR(50) NULL COMMENT 'Generated barcode: id+date+room+amount (format: id+MMDD+HH+room+amount)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

-- Sample data (optional - remove if not needed)
-- INSERT INTO transaction (date, name, room, movie, sits, amount) VALUES
-- ('11/10:14', 'user@example.com', '1', 'Sample Movie', 'A1, A2', 600);

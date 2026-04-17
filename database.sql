CREATE DATABASE IF NOT EXISTS productivity_db;
USE productivity_db;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INT NOT NULL DEFAULT 0, -- in minutes
    total_time_spent INT NOT NULL DEFAULT 0, -- in minutes
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration INT DEFAULT 0, -- in minutes
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    total_focus_time INT NOT NULL DEFAULT 0, -- in minutes
    points_earned INT NOT NULL DEFAULT 0,
    focus_score DOUBLE NOT NULL DEFAULT 0.0,
    streak INT NOT NULL DEFAULT 0,
    UNIQUE KEY user_date_unique (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

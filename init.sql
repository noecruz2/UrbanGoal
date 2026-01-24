-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS urbangoal_db;
USE urbangoal_db;

-- Crear tabla users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'customer',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  customerId VARCHAR(100),
  customerName VARCHAR(100) NOT NULL,
  customerEmail VARCHAR(100) NOT NULL,
  customerPhone VARCHAR(20),
  metroLine VARCHAR(50),
  metroStation VARCHAR(100),
  address TEXT,
  items JSON NOT NULL,
  totalPrice DECIMAL(10, 2) NOT NULL,
  paymentMethod VARCHAR(50),
  paymentStatus VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  originalPrice DECIMAL(10, 2),
  images JSON,
  description TEXT NOT NULL,
  sizes JSON NOT NULL,
  category VARCHAR(100) NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear usuario admin por defecto (contraseña hasheada: admin123)
INSERT IGNORE INTO users (id, email, password, name, role) 
VALUES ('admin-1', 'admin@tienda.com', '$2a$10$7zKriugfq5xce8d2UknANeP/17FTfZsrMdF31nI79gEQ0e2CqJ/pa', 'Admin', 'admin');

-- Insertar productos de ejemplo
INSERT IGNORE INTO products (id, name, brand, price, originalPrice, images, description, sizes, category, featured) VALUES
('prod-1', 'Air Jordan 1 Retro', 'Nike', 120.00, 180.00, '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"]', 'Zapatillas clásicas de baloncesto con estilo retro', '[{"value":"36","stock":5},{"value":"37","stock":3},{"value":"38","stock":8},{"value":"39","stock":2}]', 'running', 1),
('prod-2', 'Adidas Superstar', 'Adidas', 90.00, 110.00, '["https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=500&q=80"]', 'Las icónicas Superstar con la clásica banda de tres rayas', '[{"value":"36","stock":4},{"value":"37","stock":6},{"value":"38","stock":5}]', 'lifestyle', 1),
('prod-3', 'Puma RS-X', 'Puma', 85.00, 120.00, '["https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80"]', 'Zapatillas deportivas modernas y cómodas', '[{"value":"36","stock":3},{"value":"37","stock":5},{"value":"38","stock":7},{"value":"39","stock":4}]', 'basketball', 0),
('prod-4', 'Jersey Argentina 2022', 'Adidas', 79.99, 120.00, '["https://images.unsplash.com/photo-1522778119026-d647f0510c3f?w=500&q=80"]', 'Jersey oficial de la selección argentina - Mundial 2022', '[{"value":"S","stock":10},{"value":"M","stock":15},{"value":"L","stock":8},{"value":"XL","stock":5}]', 'mundial-2026', 1),
('prod-5', 'Jersey Brasil', 'CBF', 74.99, 110.00, '["https://images.unsplash.com/photo-1505814346881-b72b27e84530?w=500&q=80"]', 'Jersey oficial de la selección brasileña', '[{"value":"S","stock":8},{"value":"M","stock":12},{"value":"L","stock":10}]', 'mundial-2026', 1);

-- Crear usuario urbangoal si no existe
CREATE USER IF NOT EXISTS 'urbangoal'@'%' IDENTIFIED BY 'urbangoalpass';
GRANT ALL PRIVILEGES ON urbangoal_db.* TO 'urbangoal'@'%';
FLUSH PRIVILEGES;

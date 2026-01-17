-- Crea la tabla 'orders' para UrbanGoal
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  customer JSON NOT NULL,
  paymentMethod VARCHAR(20) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  createdAt DATETIME NOT NULL
);

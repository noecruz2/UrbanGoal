import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de conexión MySQL desde variables de entorno
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'urbangoal',
  password: process.env.DB_PASSWORD || 'urbangoalpass',
  database: process.env.DB_NAME || 'urbangoal_db',
};


let pool;
(async () => {
  pool = await mysql.createPool(dbConfig);
  console.log('Conectado a MySQL');
  // Crear tabla orders si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      customer JSON NOT NULL,
      paymentMethod VARCHAR(20) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL,
      createdAt DATETIME NOT NULL
    )
  `);
  console.log('Tabla orders verificada/creada');
})();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('UrbanGoal Backend funcionando');
});

// Endpoint de prueba para leer órdenes (tabla orders debe existir)
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para recibir órdenes
app.post('/api/orders', async (req, res) => {
  const order = req.body;
  try {
    // Guarda la orden en la base de datos (ajusta los campos según tu modelo)
    const [result] = await pool.query(
      'INSERT INTO orders (id, customer, paymentMethod, total, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [order.id, JSON.stringify(order.customer), order.paymentMethod, order.total, order.status, new Date(order.createdAt)]
    );
    res.status(201).json({ message: 'Orden guardada', orderId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

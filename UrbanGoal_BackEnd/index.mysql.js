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

  // Crear tabla products si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      originalPrice DECIMAL(10,2),
      images JSON NOT NULL,
      description TEXT NOT NULL,
      sizes JSON NOT NULL,
      category VARCHAR(100) NOT NULL,
      featured BOOLEAN DEFAULT FALSE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('Tabla products verificada/creada');

  // Insertar productos de prueba si la tabla está vacía
  const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
  if (products[0].count === 0) {
    const sampleProducts = [
      {
        id: 'prod-1',
        name: 'Air Jordan 1 Retro',
        brand: 'Nike',
        price: 120,
        originalPrice: 180,
        images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80']),
        description: 'Zapatillas clásicas de baloncesto con estilo retro',
        sizes: JSON.stringify([{ value: '36', stock: 5 }, { value: '37', stock: 3 }, { value: '38', stock: 8 }, { value: '39', stock: 2 }]),
        category: 'tenis',
        featured: true
      },
      {
        id: 'prod-2',
        name: 'Adidas Superstar',
        brand: 'Adidas',
        price: 90,
        originalPrice: 110,
        images: JSON.stringify(['https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800&q=80']),
        description: 'Las icónicas Superstar con la clásica banda de tres rayas',
        sizes: JSON.stringify([{ value: '36', stock: 4 }, { value: '37', stock: 6 }, { value: '38', stock: 5 }]),
        category: 'tenis',
        featured: true
      },
      {
        id: 'prod-3',
        name: 'Puma RS-X',
        brand: 'Puma',
        price: 85,
        originalPrice: 120,
        images: JSON.stringify(['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80']),
        description: 'Zapatillas deportivas modernas y cómodas',
        sizes: JSON.stringify([{ value: '36', stock: 3 }, { value: '37', stock: 5 }, { value: '38', stock: 7 }, { value: '39', stock: 4 }]),
        category: 'tenis',
        featured: false
      }
    ];

    for (const product of sampleProducts) {
      await pool.query(
        'INSERT INTO products (id, name, brand, price, originalPrice, images, description, sizes, category, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [product.id, product.name, product.brand, product.price, product.originalPrice, product.images, product.description, product.sizes, product.category, product.featured]
      );
    }
    console.log('Productos de prueba insertados');
  }
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

// Endpoint para leer productos
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows.map(product => ({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      sizes: typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const product = rows[0];
    res.json({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      sizes: typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para crear un producto
app.post('/api/products', async (req, res) => {
  const { id, name, brand, price, originalPrice, images, description, sizes, category, featured } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (id, name, brand, price, originalPrice, images, description, sizes, category, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, brand, price, originalPrice || null, JSON.stringify(images), description, JSON.stringify(sizes), category, featured || false]
    );
    res.status(201).json({ message: 'Producto creado', productId: id });
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

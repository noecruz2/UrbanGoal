import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de Mercado Pago
const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
  options: { timeout: 20000 }
});

// Configuración de conexión MySQL desde variables de entorno
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'urbangoal',
  password: process.env.DB_PASSWORD || 'urbangoalpass',
  database: 'urbangoal_db',
};


let pool;
(async () => {
  pool = await mysql.createPool(dbConfig);
  console.log('Conectado a MySQL - Tablas esperadas desde init.sql');
})();

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('UrbanGoal Backend funcionando');
});

// ====================== ENDPOINTS DE AUTENTICACIÓN ======================

// Login de usuario
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    // Buscar usuario
    const [users] = await pool.query('SELECT id, email, password, name, role FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: err.message });
  }
});

// ====================== ENDPOINTS DE ÓRDENES ======================
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
// Endpoint para crear producto (DESHABILITADO - usar admin panel en el futuro)
// app.post('/api/products', async (req, res) => {
//   const { id, name, brand, price, originalPrice, images, description, sizes, category, featured } = req.body;
//   try {
//     await pool.query(
//       'INSERT INTO products (id, name, brand, price, originalPrice, images, description, sizes, category, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//       [id, name, brand, price, originalPrice || null, JSON.stringify(images), description, JSON.stringify(sizes), category, featured || false]
//     );
//     res.status(201).json({ message: 'Producto creado', productId: id });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

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

// Endpoint para crear preferencia de pago en Mercado Pago
app.post('/api/mercadopago/preference', async (req, res) => {
  try {
    const { items, customer, orderId } = req.body;

    const preference = new Preference(mpConfig);
    
    const preferenceData = {
      items: items.map(item => ({
        id: item.product.id,
        title: `${item.product.name} (Talla ${item.size})`,
        quantity: item.quantity,
        unit_price: item.product.price,
        currency_id: 'COP',
      })),
      payer: {
        name: customer.fullName,
        phone: {
          area_code: '+57',
          number: customer.phone,
        },
        address: {
          street_name: customer.address || 'No especificado',
        },
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirmation?status=success&order_id=${orderId}`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirmation?status=failure&order_id=${orderId}`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/confirmation?status=pending&order_id=${orderId}`,
      },
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/mercadopago/webhook`,
      external_reference: orderId,
      metadata: {
        order_id: orderId,
        customer: JSON.stringify(customer),
      },
    };

    const preferenceResponse = await preference.create({ body: preferenceData });
    res.json({ 
      initPoint: preferenceResponse.init_point,
      preferenceId: preferenceResponse.id 
    });
  } catch (err) {
    console.error('Error en Mercado Pago:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook de Mercado Pago
app.post('/api/mercadopago/webhook', async (req, res) => {
  try {
    const { data, type } = req.query;

    if (type === 'payment') {
      console.log('Pago recibido:', data);
      // Aquí puedes actualizar el estado de la orden en la BD
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error en webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

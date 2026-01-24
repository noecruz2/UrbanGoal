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

// Aumentar límite de tamaño de payload para imágenes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
    
    // Obtener items para cada orden
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.query(
          `SELECT oi.*, p.name, p.brand, p.images
           FROM order_items oi
           JOIN products p ON oi.productId = p.id
           WHERE oi.orderId = ?`,
          [order.id]
        );
        return {
          ...order,
          items: items.map(item => ({
            ...item,
            images: typeof item.images === 'string' ? JSON.parse(item.images) : item.images
          }))
        };
      })
    );
    
    res.json(ordersWithItems);
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
    res.status(201).json({ 
      id, 
      name, 
      brand, 
      price, 
      originalPrice: originalPrice || null, 
      images, 
      description, 
      sizes, 
      category, 
      featured: featured || false 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para actualizar un producto
app.put('/api/products/:id', async (req, res) => {
  const { id: bodyId, name, brand, price, originalPrice, images, description, sizes, category, featured } = req.body;
  const { id: paramId } = req.params;
  try {
    await pool.query(
      'UPDATE products SET name = ?, brand = ?, price = ?, originalPrice = ?, images = ?, description = ?, sizes = ?, category = ?, featured = ? WHERE id = ?',
      [name, brand, price, originalPrice || null, JSON.stringify(images), description, JSON.stringify(sizes), category, featured || false, paramId]
    );
    res.status(200).json({ 
      id: paramId,
      name, 
      brand, 
      price, 
      originalPrice: originalPrice || null, 
      images, 
      description, 
      sizes, 
      category, 
      featured: featured || false 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint anterior para crear producto (DESHABILITADO - usar admin panel en el futuro)
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
  const { 
    id, 
    items, 
    customer, 
    paymentMethod, 
    total, 
    status = 'pending',
    metroLine,
    metroStation,
    address,
    notes
  } = req.body;

  if (!id || !items || !customer || !total) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, items, customer, total' });
  }

  try {
    // Iniciar transacción para asegurar consistencia
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Guardar la orden (sin items JSON)
      await connection.query(
        `INSERT INTO orders (
          id, customerId, customerName, customerEmail, customerPhone, 
          metroLine, metroStation, address, totalPrice, paymentMethod, 
          paymentStatus, notes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          customer.id || null,
          customer.fullName || customer.name || 'Cliente',
          customer.email || '',
          customer.phone || null,
          metroLine || null,
          metroStation || null,
          address || null,
          total,
          paymentMethod || 'bank-transfer',
          status,
          notes || null
        ]
      );

      // 2. Guardar items de la orden en order_items y actualizar stock
      for (const item of items) {
        const productId = item.product.id;
        const quantity = item.quantity;
        const size = item.size;
        const itemId = `item-${uuidv4()}`;

        // Obtener el producto actual
        const [productRows] = await connection.query(
          'SELECT sizes, price FROM products WHERE id = ?',
          [productId]
        );

        if (productRows.length === 0) {
          throw new Error(`Producto con ID ${productId} no encontrado`);
        }

        const product = productRows[0];
        const sizes = typeof product.sizes === 'string' 
          ? JSON.parse(product.sizes) 
          : product.sizes;

        // Buscar la talla y actualizar stock
        const sizeIndex = sizes.findIndex(s => s.value === size);
        if (sizeIndex === -1) {
          throw new Error(`Talla ${size} no encontrada para el producto ${productId}`);
        }

        // Restar cantidad del stock
        sizes[sizeIndex].stock = Math.max(0, sizes[sizeIndex].stock - quantity);

        // Guardar item en order_items
        await connection.query(
          `INSERT INTO order_items (id, orderId, productId, quantity, size, priceAtPurchase, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [itemId, id, productId, quantity, size, product.price]
        );

        // Actualizar stock del producto
        await connection.query(
          'UPDATE products SET sizes = ? WHERE id = ?',
          [JSON.stringify(sizes), productId]
        );
      }

      // Confirmar transacción
      await connection.commit();
      connection.release();

      // Obtener la orden completa con items para respuesta
      const [orderItems] = await pool.query(
        `SELECT oi.*, p.name, p.brand 
         FROM order_items oi 
         JOIN products p ON oi.productId = p.id 
         WHERE oi.orderId = ?`,
        [id]
      );

      res.status(201).json({ 
        message: 'Orden guardada exitosamente', 
        orderId: id,
        items: orderItems
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
        if (sizeIndex === -1) {
          throw new Error(`Talla ${size} no encontrada para el producto ${productId}`);
        }

        // Restar cantidad del stock
        sizes[sizeIndex].stock = Math.max(0, sizes[sizeIndex].stock - quantity);

        // Actualizar producto
        await connection.query(
          'UPDATE products SET sizes = ? WHERE id = ?',
          [JSON.stringify(sizes), productId]
        );
      }

      // Confirmar transacción
      await connection.commit();
      connection.release();

      res.status(201).json({ 
        message: 'Orden guardada exitosamente', 
        orderId: id,
        status: 'success'
      });
    } catch (err) {
      // Revertir transacción si hay error
      await connection.rollback();
      connection.release();
      throw err;
    }
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

// ====================== ENDPOINTS DE CATEGORÍAS ======================

// Obtener todas las categorías
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener una categoría por ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear una nueva categoría
app.post('/api/categories', async (req, res) => {
  const { id, name, slug } = req.body;
  
  if (!id || !name || !slug) {
    return res.status(400).json({ error: 'id, name y slug son requeridos' });
  }

  try {
    await pool.query(
      'INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)',
      [id, name, slug]
    );
    res.status(201).json({ id, name, slug });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La categoría ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Actualizar una categoría
app.put('/api/categories/:id', async (req, res) => {
  const { name, slug } = req.body;
  const { id } = req.params;
  
  if (!name || !slug) {
    return res.status(400).json({ error: 'name y slug son requeridos' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE categories SET name = ?, slug = ? WHERE id = ?',
      [name, slug, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ id, name, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar una categoría
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.status(200).json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
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

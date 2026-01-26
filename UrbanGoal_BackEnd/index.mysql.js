import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { generateToken, verifyAuth, verifyAdmin } from './auth-middleware.js';
import validation from './validation.js';
import { sanitizeInputs } from './input-validation.js';
import dotenv from 'dotenv';
import { sendOrderConfirmation, sendAdminNotification } from './email-service.js';
import { sendOrderNotificationWhatsApp, sendAdminNotificationWhatsApp } from './whatsapp-service.js';
import { uploadMultipleImages, processAndSaveImages, deleteImages } from './image-upload.js';

// Cargar variables de entorno
dotenv.config();

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
  database: process.env.DB_NAME || 'urbangoal_db',
};

let pool;
(async () => {
  pool = await mysql.createPool(dbConfig);
  console.log('Conectado a MySQL - Tablas esperadas desde init.sql');
})();

// ==================== SEGURIDAD ====================

// Helmet para HTTP security headers - CSP desactivado para permitir el acceso a imágenes
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS mejorado - whitelist de orígenes permitidos
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting general
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Demasiadas solicitudes, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || '5'),
  message: 'Demasiados intentos de login, intenta más tarde',
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
});

app.use('/api/', apiLimiter);

// ==================== MIDDLEWARE ====================

// Aumentar límite de tamaño de payload para imágenes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Sanitizar todos los inputs para prevenir XSS e inyecciones
app.use(sanitizeInputs);

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static('public/uploads'));

app.get('/', (req, res) => {
  res.send('UrbanGoal Backend funcionando');
});

// ====================== ENDPOINTS DE AUTENTICACIÓN ======================

// Login de usuario
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar inputs
    const emailValidation = validation.validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validation.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Buscar usuario
    const [users] = await pool.query('SELECT id, email, password, name, role FROM users WHERE email = ?', [emailValidation.value]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(passwordValidation.value, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar JWT token
    const token = generateToken(user);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token: token
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en autenticación' });
  }
});

// ====================== ENDPOINTS DE ÓRDENES ======================
// Obtener órdenes (solo admin)
app.get('/api/orders', verifyAuth, verifyAdmin, async (req, res) => {
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

// Endpoint para crear un producto (PROTEGIDO - Solo Admin)
// Puede subir imágenes o enviar URLs
app.post('/api/products', verifyAuth, verifyAdmin, uploadMultipleImages, async (req, res) => {
  const { id, name, brand, price, originalPrice, description, sizes, category, featured, images: bodyImages } = req.body;
  
  // Validación de inputs
  if (!id || !name || !brand || !price || !sizes || !category) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  
  // Validar que price es un número positivo
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Precio debe ser un número positivo' });
  }
  
  // Validar que sizes es un array
  if (!Array.isArray(sizes)) {
    return res.status(400).json({ error: 'Sizes debe ser un array' });
  }
  
  try {
    let images = [];

    // Si hay archivos subidos, procesarlos
    if (req.files && req.files.length > 0) {
      const uploadedImages = await processAndSaveImages(req.files);
      images = uploadedImages.map(img => img.url);
    } 
    // Si vienen URLs en el body, usarlas
    else if (bodyImages && Array.isArray(bodyImages) && bodyImages.length > 0) {
      images = bodyImages;
    }

    // Si no hay imágenes, retornar error
    if (images.length === 0) {
      return res.status(400).json({ error: 'Debes subir al menos una imagen o proporcionar URLs' });
    }

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
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Endpoint para actualizar un producto (PROTEGIDO - Solo Admin)
app.put('/api/products/:id', verifyAuth, verifyAdmin, uploadMultipleImages, async (req, res) => {
  const { id: bodyId, name, brand, price, originalPrice, description, sizes, category, featured, existingImages } = req.body;
  const { id: paramId } = req.params;
  
  // Validación de inputs
  if (!name || !brand || !price || !sizes || !category) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  
  // Validar que price es un número positivo
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Precio debe ser un número positivo' });
  }
  
  try {
    let images = [];
    let parsedSizes = sizes;

    // Parsear sizes si viene como string JSON
    if (typeof sizes === 'string') {
      try {
        parsedSizes = JSON.parse(sizes);
      } catch (e) {
        parsedSizes = sizes;
      }
    }

    // Parsear imágenes existentes
    let existingImagesList = [];
    if (existingImages) {
      if (typeof existingImages === 'string') {
        try {
          existingImagesList = JSON.parse(existingImages);
        } catch (e) {
          existingImagesList = [];
        }
      } else if (Array.isArray(existingImages)) {
        existingImagesList = existingImages;
      }
    }

    // Si hay nuevos archivos subidos, procesarlos
    if (req.files && req.files.length > 0) {
      console.log(`[PUT] Procesando ${req.files.length} archivos nuevos`);
      const uploadedImages = await processAndSaveImages(req.files);
      const newImageUrls = uploadedImages.map(img => img.url);
      console.log(`[PUT] URLs de imágenes nuevas:`, newImageUrls);
      
      // Combinar imágenes existentes con nuevas
      images = [...existingImagesList, ...newImageUrls];
      console.log(`[PUT] Total de imágenes después de combinar: ${images.length}`);
    } 
    // Si no hay archivos nuevos, usar solo las existentes
    else if (existingImagesList.length > 0) {
      images = existingImagesList;
    }

    // Si no hay imágenes, retornar error
    if (images.length === 0) {
      return res.status(400).json({ error: 'Debes tener al menos una imagen' });
    }

    await pool.query(
      'UPDATE products SET name = ?, brand = ?, price = ?, originalPrice = ?, images = ?, description = ?, sizes = ?, category = ?, featured = ? WHERE id = ?',
      [name, brand, price, originalPrice || null, JSON.stringify(images), description, JSON.stringify(parsedSizes), category, featured || false, paramId]
    );
    res.status(200).json({ 
      id: paramId,
      name, 
      brand, 
      price, 
      originalPrice: originalPrice || null, 
      images, 
      description, 
      sizes: parsedSizes, 
      category, 
      featured: featured || false 
    });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Endpoint para eliminar un producto (PROTEGIDO - Solo Admin)
app.delete('/api/products/:id', verifyAuth, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Validar que ID es válido
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
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

// Endpoint para recibir órdenes (CON VALIDACIÓN MEJORADA)
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

  // Validación exhaustiva de inputs
  if (!id || !items || !customer || !total) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, items, customer, total' });
  }

  // Validar que id es string
  if (typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'ID debe ser un string válido' });
  }

  // Validar que items es un array no vacío
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items debe ser un array no vacío' });
  }

  // Validar que cada item tiene los campos necesarios
  for (const item of items) {
    if (!item.product || !item.product.id || !item.quantity || !item.size) {
      return res.status(400).json({ error: 'Cada item debe tener product, quantity y size' });
    }
    if (isNaN(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'quantity debe ser un número positivo' });
    }
  }

  // Validar customer
  if (typeof customer !== 'object' || !customer.fullName || !customer.email) {
    return res.status(400).json({ error: 'customer debe tener fullName y email' });
  }

  // Validar email
  if (!validation.validateEmail(customer.email).isValid) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  // Validar que total es un número positivo
  if (isNaN(total) || total <= 0) {
    return res.status(400).json({ error: 'total debe ser un número positivo' });
  }

  // Validar paymentMethod
  const validPaymentMethods = ['mercadopago', 'transfer', 'cash'];
  if (!validPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: `paymentMethod debe ser uno de: ${validPaymentMethods.join(', ')}` });
  }

  let connection;
  try {
    // Iniciar transacción para asegurar consistencia
    connection = await pool.getConnection();
    await connection.beginTransaction();

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

    // Obtener la orden completa con items para respuesta
    const [orderItems] = await pool.query(
      `SELECT oi.*, p.name, p.brand 
       FROM order_items oi 
       JOIN products p ON oi.productId = p.id 
       WHERE oi.orderId = ?`,
      [id]
    );

    // Enviar email de confirmación de forma asíncrona (no bloquear respuesta)
    if (customer.email) {
      sendOrderConfirmation(
        customer.email,
        customer.fullName || customer.name || 'Cliente',
        id,
        orderItems,
        total
      ).catch(err => console.error('Error enviando email:', err));
    }

    // Enviar notificación por WhatsApp al cliente
    if (customer.phone) {
      sendOrderNotificationWhatsApp(
        customer.phone,
        customer.fullName || customer.name || 'Cliente',
        id,
        total
      ).catch(err => console.error('Error enviando WhatsApp:', err));
    }

    // Notificar al admin por email
    sendAdminNotification(
      id,
      customer.fullName || customer.name || 'Cliente',
      customer.phone || 'No especificado',
      total
    ).catch(err => console.error('Error enviando email admin:', err));

    // Notificar al admin por WhatsApp (si está configurado)
    sendAdminNotificationWhatsApp(
      '525574756704',
      customer.fullName || customer.name || 'Cliente',
      id,
      customer.phone || 'No especificado',
      total
    ).catch(err => console.error('Error enviando WhatsApp admin:', err));

    res.status(201).json({ 
      message: 'Orden guardada exitosamente', 
      orderId: id,
      items: orderItems
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Error en rollback:', rollbackErr);
      }
    }
    console.error('Error al crear orden:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
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

// Crear una nueva categoría (PROTEGIDO - Solo Admin)
app.post('/api/categories', verifyAuth, verifyAdmin, async (req, res) => {
  const { id, name, slug } = req.body;
  
  if (!id || !name || !slug) {
    return res.status(400).json({ error: 'id, name y slug son requeridos' });
  }
  
  // Validar que name y slug son strings válidos
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name debe ser un string válido' });
  }
  
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    return res.status(400).json({ error: 'slug debe ser un string válido' });
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
    console.error('Error al crear categoría:', err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// Actualizar una categoría (PROTEGIDO - Solo Admin)
app.put('/api/categories/:id', verifyAuth, verifyAdmin, async (req, res) => {
  const { name, slug } = req.body;
  const { id } = req.params;
  
  if (!name || !slug) {
    return res.status(400).json({ error: 'name y slug son requeridos' });
  }
  
  // Validar que name y slug son strings válidos
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name debe ser un string válido' });
  }
  
  if (typeof slug !== 'string' || slug.trim().length === 0) {
    return res.status(400).json({ error: 'slug debe ser un string válido' });
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
    console.error('Error al actualizar categoría:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// Eliminar una categoría (PROTEGIDO - Solo Admin)
app.delete('/api/categories/:id', verifyAuth, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  
  // Validar que ID es válido
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  try {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.status(200).json({ message: 'Categoría eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
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

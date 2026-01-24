# Auditoría de Seguridad - UrbanGoal E-Commerce
**Fecha:** 24 de enero de 2026  
**Estado General:** ⚠️ **CRÍTICO - Múltiples vulnerabilidades encontradas**

---

## 📋 Resumen Ejecutivo

Se han identificado **8 vulnerabilidades críticas y 12 problemas de seguridad** que requieren atención inmediata antes de llevar la aplicación a producción. El código tiene protecciones básicas (prepared statements, bcrypt) pero le faltan controles de seguridad esenciales (autenticación, autorización, rate limiting, etc.).

**Riesgo Actual:** 🔴 **ALTO** - No recomendado para producción sin correcciones.

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. **CORS Completamente Abierto - Acceso de Cualquier Origen**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [UrbanGoal_BackEnd/index.mysql.js#L31-L37](UrbanGoal_BackEnd/index.mysql.js#L31-L37)

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // ❌ MUY INSEGURO
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // ...
});
```

**Problema:** Cualquier sitio web puede hacer requests a tu API. Permite ataques CSRF, robo de datos, consumo de recursos.

**Impacto:** Alguien podría crear un sitio malicioso que robe datos de órdenes, información de clientes, o manipular productos.

**Solución Recomendada:**
```javascript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://tudominio.com',
  'https://www.tudominio.com'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
```

---

### 2. **Endpoints Administrativos SIN AUTENTICACIÓN**
**Severidad:** 🔴 CRÍTICA  
**Archivos:** 
- POST/PUT/DELETE `/api/products` 
- POST/PUT/DELETE `/api/categories`

**Problema:** Cualquiera puede crear, editar o eliminar productos/categorías sin permiso.

```javascript
// ❌ CUALQUIERA PUEDE HACER ESTO:
// POST /api/products - crear producto falso
// PUT /api/products/prod-1 - modificar precio a $0.01
// DELETE /api/products/prod-1 - eliminar todo el catálogo
```

**Impacto:** 
- Destrucción de catálogo
- Cambio de precios
- Robo de datos de clientes

**Solución Recomendada:**
```javascript
// Middleware de autenticación
const verifyAuth = (req, res, next) => {
  const userId = req.headers['x-user-id']; // O usar JWT tokens
  const token = req.headers.authorization?.split(' ')[1];
  
  // Validar token
  if (!token || !isValidToken(token)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  req.userId = userId;
  next();
};

// Middleware de rol admin
const verifyAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado - requiere admin' });
  }
  next();
};

// Proteger endpoints sensibles
app.post('/api/products', verifyAuth, verifyAdmin, async (req, res) => {
  // ...
});
```

---

### 3. **Credenciales Hardcodeadas en Variables de Entorno (Sin Validación)**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [docker-compose.yml#L20-L22](docker-compose.yml#L20-L22)

```yaml
environment:
  - DB_USER=urbangoal
  - DB_PASSWORD=urbangoalpass  # ❌ Default débil visible en repo
```

**Problemas:**
- Contraseña predecible y visible en código fuente
- No hay encriptación
- El MP_ACCESS_TOKEN se expone si alguien obtiene acceso al contenedor

**Impacto:** Acceso a base de datos, creación de preferencias fraudulentas en Mercado Pago.

**Solución Recomendada:**
```yaml
# docker-compose.yml
environment:
  - DB_HOST=mysql
  - DB_USER=${DB_USER}  # Variables de entorno real
  - DB_PASSWORD=${DB_PASSWORD}
  - MP_ACCESS_TOKEN=${MP_ACCESS_TOKEN}
  - JWT_SECRET=${JWT_SECRET}

# .env.example (NUNCA comitear .env real)
DB_USER=urbangoal
DB_PASSWORD=generarcontrasenaFuerte123!@#
MP_ACCESS_TOKEN=xxxxxxxxxxxx
JWT_SECRET=generarSecretoAleatorio32Caracteres
```

---

### 4. **Base de Datos EXPUESTA en Red**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [docker-compose.yml#L31](docker-compose.yml#L31)

```yaml
mysql:
  ports:
    - "3306:3306"  # ❌ EXPUESTA al mundo exterior
```

**Problema:** MySQL está escuchando en 0.0.0.0:3306. Cualquiera en la red puede conectarse.

**Solución Recomendada:**
```yaml
mysql:
  # ❌ Eliminar o comentar la línea de ports
  # Si necesitas acceso local en desarrollo:
  # ports:
  #   - "127.0.0.1:3306:3306"  # Solo localhost
  environment:
    # Asegurarse que los permisos sean estrictos
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

---

### 5. **No hay Rate Limiting - Vulnerable a Brute Force**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [UrbanGoal_BackEnd/index.mysql.js#L54](UrbanGoal_BackEnd/index.mysql.js#L54)

```javascript
// ❌ CUALQUIERA PUEDE INTENTAR INFINITAS CONTRASEÑAS
app.post('/api/auth/login', async (req, res) => {
  // No hay verificación de intentos fallidos
  // No hay delay entre intentos
  // No hay IP blocking
});
```

**Impacto:** Ataques de fuerza bruta al login de admin.

**Solución Recomendada:**
```javascript
import rateLimit from 'express-rate-limit';

// Limitar intentos de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de login. Intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // ...
});

// Rate limiting general
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', apiLimiter);
```

---

### 6. **Información Sensible en Mensajes de Error**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [UrbanGoal_BackEnd/index.mysql.js#L80](UrbanGoal_BackEnd/index.mysql.js#L80)

```javascript
catch (err) {
  res.status(500).json({ error: err.message }); // ❌ Expone detalles del error
}
```

**Problema:** Los errores de SQL exponen la estructura de la BD. Ej: `"Table 'urbangoal_db.orders' doesn't exist"`

**Impacto:** Información para hacer ataques dirigidos.

**Solución Recomendada:**
```javascript
catch (err) {
  console.error('Error detallado:', err); // Log internamente
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Error interno del servidor' });
  } else {
    res.status(500).json({ error: err.message });
  }
}
```

---

### 7. **Validación de Entrada Insuficiente**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [UrbanGoal_BackEnd/index.mysql.js#L55-L61](UrbanGoal_BackEnd/index.mysql.js#L55-L61)

```javascript
// ❌ Minimal validation
if (!email || !password) {
  return res.status(400).json({ error: 'Email y password son requeridos' });
}
// Pero NO valida:
// - Formato de email válido
// - Longitud de password
// - Caracteres especiales maliciosos en strings
```

**Impacto:** Posible injection, datos inválidos que causan errores inesperados.

**Solución Recomendada:**
```javascript
import validator from 'validator';

const email = req.body.email?.trim();
const password = req.body.password;

// Validar email
if (!email || !validator.isEmail(email)) {
  return res.status(400).json({ error: 'Email inválido' });
}

// Validar password
if (!password || password.length < 8) {
  return res.status(400).json({ error: 'Password debe tener mínimo 8 caracteres' });
}

if (password.length > 128) {
  return res.status(400).json({ error: 'Password muy largo' });
}
```

---

### 8. **Token de Acceso Mercado Pago Almacenado en Variable de Entorno SIN Protección**
**Severidad:** 🔴 CRÍTICA  
**Archivo:** [UrbanGoal_BackEnd/index.mysql.js#L12](UrbanGoal_BackEnd/index.mysql.js#L12)

```javascript
const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '', // ❌ Sin validación
  options: { timeout: 20000 }
});
```

**Problema:** El token está en texto plano en memoria. Si alguien logra acceso al proceso o logs, puede extraerlo.

**Impacto:** Acceso fraudulento a cuenta de Mercado Pago, creación de preferencias falsas.

**Solución Recomendada:**
```javascript
// Validar que el token exista
if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error('MP_ACCESS_TOKEN no configurado. Revisa las variables de entorno.');
}

const mpConfig = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 20000 }
});

// Nunca logear el token completo
console.log(`Mercado Pago configurado (token: ${process.env.MP_ACCESS_TOKEN.substring(0, 10)}...)`);
```

---

## 🟠 PROBLEMAS DE SEGURIDAD ALTOS

### 9. **No hay Autenticación en GET /api/orders (Expone Todos los Pedidos)**
**Severidad:** 🟠 ALTA  
**Archivo:** [UrbanGoal_BackEnd/index.mysql.js#L87](UrbanGoal_BackEnd/index.mysql.js#L87)

```javascript
// ❌ CUALQUIERA PUEDE VER TODAS LAS ÓRDENES
app.get('/api/orders', async (req, res) => {
  const [orders] = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
  // Expone: emails, teléfonos, direcciones, totales de clientes
});
```

**Impacto:** Exposición de PII (información personal identificable) de todos los clientes.

**Solución:** Proteger con autenticación/autorización.

---

### 10. **localStorage Almacena Datos de Usuario sin Encriptación**
**Severidad:** 🟠 ALTA  
**Archivo:** [UrbanGoal_FrontEnd/src/context/AuthContext.tsx#L22-L31](UrbanGoal_FrontEnd/src/context/AuthContext.tsx#L22-L31)

```typescript
// ❌ Almacena credenciales en texto plano
const [user, setUser] = useState<User | null>(() => {
  const saved = localStorage.getItem('auth_user');
  return saved ? JSON.parse(saved) : null;
});

useEffect(() => {
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user)); // ❌ Vulnerable a XSS
  }
});
```

**Problemas:**
- localStorage es vulnerable a XSS (ataques de scripts inyectados)
- Los datos se pueden leer con DevTools
- Sin encriptación

**Solución Recomendada:**
```typescript
// Opción 1: Usar sessionStorage (menos seguro pero mejor que localStorage)
sessionStorage.setItem('auth_user', JSON.stringify(user));

// Opción 2: Usar HTTP-only cookies (MEJOR - servidor maneja session)
// El backend debe enviar Set-Cookie headers
// fetch (desde frontend) envía cookies automáticamente

// Opción 3: JWT en memory + refresh tokens
const [user, setUser] = useState<User | null>(null);
// Sin persistencia automática - requiere re-login tras recarga
```

---

### 11. **No hay Protección contra XSS en Inputs**
**Severidad:** 🟠 ALTA  
**Archivo:** [UrbanGoal_FrontEnd/src/pages/Checkout.tsx](UrbanGoal_FrontEnd/src/pages/Checkout.tsx)

```typescript
// ❌ Campos de texto sin sanitización
<input 
  value={customerName}
  onChange={(e) => setCustomerName(e.target.value)} 
/>
```

**Problema:** Si un cliente ingresa `<img src=x onerror="alert('hacked')">`  se ejecutaría JavaScript.

**Solución Recomendada:**
```typescript
import DOMPurify from 'dompurify';

const handleNameChange = (value: string) => {
  const sanitized = DOMPurify.sanitize(value);
  setCustomerName(sanitized);
};
```

---

### 12. **Sin JWT o Session Tokens - Solo localStorage**
**Severidad:** 🟠 ALTA

**Problema:** No hay token de sesión. El frontend solo almacena datos del usuario sin validación.

**Impacto:** Un atacante puede editar localStorage y hacerse pasar por admin.

**Solución Recomendada:** Implementar JWT tokens.

---

## 🟡 PROBLEMAS MEDIO

### 13. **Contraseña de MySQL Débil en Producción**
**Severidad:** 🟡 MEDIA  
```
DB_PASSWORD=urbangoalpass  # Solo 13 caracteres, sin símbolos especiales
```

**Recomendación:** Mínimo 16 caracteres, incluir: MAYÚS, minús, números, símbolos.

---

### 14. **Sin HTTPS en docker-compose**
**Severidad:** 🟡 MEDIA

**Problema:** Las credenciales viajan en HTTP sin encripción.

**Recomendación:** Implementar HTTPS con Nginx/Caddy en producción.

---

### 15. **Sin Logging de Seguridad**
**Severidad:** 🟡 MEDIA

**Problema:** No hay logs de intentos fallidos, cambios de datos, etc.

**Recomendación:** Implementar logging centralizado.

---

### 16. **Sin Validación de Talla de Archivo de Imagen**
**Severidad:** 🟡 MEDIA  
**Archivo:** [UrbanGoal_FrontEnd/src/components/admin/ImageUploader.tsx](UrbanGoal_FrontEnd/src/components/admin/ImageUploader.tsx)

```typescript
// ❌ Acepta cualquier tamaño hasta 50MB
app.use(express.json({ limit: '50mb' }));
```

**Problema:** Consumo excesivo de recursos, DoS.

**Solución:**
```javascript
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

app.use(express.json({ 
  limit: '50mb',
  // Validar en cada endpoint
}));

app.post('/api/products', (req, res) => {
  if (req.body.image && req.body.image.length > MAX_IMAGE_SIZE) {
    return res.status(413).json({ error: 'Imagen muy grande' });
  }
});
```

---

### 17. **Sin Protección CSRF (Cross-Site Request Forgery)**
**Severidad:** 🟡 MEDIA

**Problema:** Un sitio malicioso podría hacer requests a la API en nombre del usuario.

**Solución:**
```javascript
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

app.post('/api/products', csrfProtection, async (req, res) => {
  // Validar CSRF token
});
```

---

### 18. **Sin Control de Versión de API**
**Severidad:** 🟡 MEDIA

**Recomendación:** Usar versionamiento de API (`/api/v1/...`) para cambios sin romper clientes existentes.

---

## ✅ LO QUE ESTÁ BIEN

### Puntos Positivos de Seguridad:
1. ✅ **Prepared Statements** - Uso correcto de `?` evita SQL injection
2. ✅ **Bcrypt para Contraseñas** - Hash seguro con salt
3. ✅ **Transacciones de Base de Datos** - Consistencia en órdenes
4. ✅ **Foreign Keys** - Integridad referencial
5. ✅ **Tipo de Input - type="password"** - No expone contraseña en pantalla
6. ✅ **UUID para IDs** - Mejor que secuencial (menos enumerable)
7. ✅ **Validación Básica** - Revisa si campos existen

---

## 📋 Plan de Remediación (Prioridad)

### INMEDIATO (Antes de Producción):
- [ ] Implementar autenticación/autorización en endpoints admin
- [ ] Arreglar CORS (whitelist específica)
- [ ] Proteger MySQL con contraseña fuerte
- [ ] Implementar rate limiting en login
- [ ] Validar inputs con validator
- [ ] Usar JWT tokens en lugar de localStorage

### CORTO PLAZO (1-2 semanas):
- [ ] Implementar HTTPS/TLS
- [ ] Añadir CSRF protection
- [ ] Logging de seguridad
- [ ] Sanitizar inputs (XSS prevention)
- [ ] HTTP headers de seguridad (Helmet)

### MEDIANO PLAZO (1 mes):
- [ ] Implementar CAPTCHA en login
- [ ] Auditoría de código profesional
- [ ] Penetration testing
- [ ] Security headers (CSP, X-Frame-Options)
- [ ] WAF (Web Application Firewall)

---

## 🔧 Dependencias de Seguridad Recomendadas

```json
{
  "dependencies": {
    "helmet": "^7.1.0",           // Headers de seguridad HTTP
    "express-rate-limit": "^7.1.5", // Rate limiting
    "validator": "^13.11.0",       // Validación de inputs
    "jsonwebtoken": "^9.1.2",      // JWT tokens
    "bcryptjs": "^2.4.3",          // Ya incluido ✅
    "dompurify": "^3.0.6",         // Sanitizar HTML (frontend)
    "dotenv": "^16.3.1",           // Variables de entorno
    "cors": "^2.8.5"               // CORS mejorado
  }
}
```

---

## 📞 Próximos Pasos

1. Crear `.env` y `.env.example` con variables sensibles
2. Implementar middleware de autenticación
3. Revisar y actualizar CORS
4. Añadir rate limiting
5. Implementar JWT tokens
6. Crear tests de seguridad

**Contacto para auditoría profesional:** Se recomienda realizar una auditoría de seguridad profesional antes de llevar a producción.

---

**Última actualización:** 24 de enero de 2026  
**Estado:** En Revisión ⏳

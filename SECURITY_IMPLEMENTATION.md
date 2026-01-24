# 🔒 Guía de Implementación de Seguridad - UrbanGoal

**Fecha:** 24 de enero de 2026  
**Objetivo:** Migrar de desarrollo inseguro a producción segura

---

## 📋 Tabla de Contenidos
1. [Paso 1: Configuración Inicial](#paso-1)
2. [Paso 2: Implementar JWT Tokens](#paso-2)
3. [Paso 3: Proteger Endpoints Admin](#paso-3)
4. [Paso 4: Validación de Inputs](#paso-4)
5. [Paso 5: CORS y Rate Limiting](#paso-5)
6. [Paso 6: HTTP Headers de Seguridad](#paso-6)

---

## <a name="paso-1"></a>Paso 1: Configuración Inicial (30 min)

### 1.1 Crear archivo `.env`
```bash
# Copiar .env.example a .env y rellenar con valores reales
cp .env.example .env
```

**IMPORTANTE:** Nunca comitear `.env` real. Solo `.env.example`.

### 1.2 Generar Secretos Seguros
```bash
# Generar JWT_SECRET fuerte (32 caracteres aleatorios)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar contraseña de BD fuerte
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Copiar los valores generados a `.env`.

### 1.3 Crear `.gitignore`
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "node_modules/" >> .gitignore
```

---

## <a name="paso-2"></a>Paso 2: Implementar JWT Tokens (1 hora)

### 2.1 Instalar Dependencias
```bash
cd UrbanGoal_BackEnd
npm install jsonwebtoken validator helmet express-rate-limit
```

### 2.2 Actualizar Backend Login
El middleware JWT ya está creado en `auth-middleware.js`. 

**Modificar** `index.mysql.js` para retornar token en login:

```javascript
// En el endpoint POST /api/auth/login (después de validar credenciales)
import { generateToken } from './auth-middleware.js';

if (isPasswordValid) {
  const token = generateToken(user);
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    token: token  // ← Agregar esto
  });
}
```

### 2.3 Actualizar Frontend para Usar Token
**Modificar** `AuthContext.tsx`:

```typescript
const login = useCallback(async (email: string, password: string): Promise<boolean> => {
  try {
    setLoading(true);
    const response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      return false;
    }

    const userData = await response.json();
    
    // Almacenar token en sessionStorage en lugar de localStorage
    if (userData.token) {
      sessionStorage.setItem('auth_token', userData.token);
    }
    
    // Almacenar datos del usuario
    setUser({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role
    });
    
    return true;
  } catch (error) {
    console.error('Error en login:', error);
    return false;
  } finally {
    setLoading(false);
  }
}, []);
```

### 2.4 Crear Hook para Token
**Crear nuevo archivo** `useAuthToken.ts`:

```typescript
export const useAuthToken = () => {
  return sessionStorage.getItem('auth_token');
};

export const useAuthHeader = () => {
  const token = useAuthToken();
  if (!token) return {};
  return {
    'Authorization': `Bearer ${token}`
  };
};
```

---

## <a name="paso-3"></a>Paso 3: Proteger Endpoints Admin (1.5 horas)

### 3.1 Importar Middleware en Backend
```javascript
// Al inicio de index.mysql.js
import { verifyAuth, verifyAdmin } from './auth-middleware.js';
```

### 3.2 Proteger Endpoints de Productos
**Cambiar:**
```javascript
// ❌ ANTES (sin protección)
app.post('/api/products', async (req, res) => { ... });

// ✅ DESPUÉS (con autenticación)
app.post('/api/products', verifyAuth, verifyAdmin, async (req, res) => { ... });
app.put('/api/products/:id', verifyAuth, verifyAdmin, async (req, res) => { ... });
app.delete('/api/products/:id', verifyAuth, verifyAdmin, async (req, res) => { ... });
```

### 3.3 Proteger Endpoints de Categorías
```javascript
app.post('/api/categories', verifyAuth, verifyAdmin, async (req, res) => { ... });
app.put('/api/categories/:id', verifyAuth, verifyAdmin, async (req, res) => { ... });
app.delete('/api/categories/:id', verifyAuth, verifyAdmin, async (req, res) => { ... });
```

### 3.4 Proteger GET de Órdenes
```javascript
// Solo admins pueden ver todas las órdenes
app.get('/api/orders', verifyAuth, verifyAdmin, async (req, res) => { ... });
```

### 3.5 Actualizar Requests del Frontend
**En Admin Dashboard, al hacer fetch:**

```typescript
import { useAuthToken } from '@/hooks/useAuthToken';

const token = useAuthToken();

const response = await fetch(API_ENDPOINTS.products.create, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(productData)
});
```

---

## <a name="paso-4"></a>Paso 4: Validación de Inputs (1 hora)

### 4.1 Importar Validadores
```javascript
// En index.mysql.js
import validation from './validation.js';
const { validateEmail, validatePassword, validateName } = validation;
```

### 4.2 Actualizar Endpoint de Login
```javascript
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ VALIDAR INPUTS
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Usar valores validados
    const validEmail = emailValidation.value;
    const validPassword = passwordValidation.value;

    // ... resto del código
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en autenticación' });
  }
});
```

### 4.3 Validar Creación de Productos
```javascript
app.post('/api/products', verifyAuth, verifyAdmin, async (req, res) => {
  const { id, name, brand, price, description, sizes, category } = req.body;

  // Validar cada campo
  const idValidation = validateUUID(id);
  if (!idValidation.isValid) {
    return res.status(400).json({ error: idValidation.error });
  }

  const nameValidation = validateName(name);
  if (!nameValidation.isValid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  const priceValidation = validatePrice(price);
  if (!priceValidation.isValid) {
    return res.status(400).json({ error: priceValidation.error });
  }

  const descriptionValidation = validateDescription(description);
  if (!descriptionValidation.isValid) {
    return res.status(400).json({ error: descriptionValidation.error });
  }

  const sizesValidation = validateSizes(sizes);
  if (!sizesValidation.isValid) {
    return res.status(400).json({ error: sizesValidation.error });
  }

  try {
    // Usar valores validados
    await pool.query(
      'INSERT INTO products ...',
      [
        idValidation.value,
        nameValidation.value,
        brand,
        priceValidation.value,
        descriptionValidation.value,
        JSON.stringify(sizes),
        category
      ]
    );
    
    res.status(201).json({ message: 'Producto creado exitosamente' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});
```

---

## <a name="paso-5"></a>Paso 5: CORS y Rate Limiting (1 hora)

### 5.1 Arreglar CORS
**Reemplazar en index.mysql.js:**

```javascript
import cors from 'cors';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

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
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Remover la antigua configuración manual de CORS
```

### 5.2 Añadir Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

// Rate limiting general
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Demasiadas solicitudes, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para login (más restrictivo)
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || '5'),
  message: 'Demasiados intentos de login fallidos, intenta más tarde',
  skipSuccessfulRequests: true, // No contar intentos exitosos
});

// Aplicar limitadores
app.use('/api/', apiLimiter);
app.post('/api/auth/login', loginLimiter);
```

---

## <a name="paso-6"></a>Paso 6: HTTP Headers de Seguridad (45 min)

### 6.1 Instalar Helmet
```bash
cd UrbanGoal_BackEnd
npm install helmet
```

### 6.2 Usar Helmet
```javascript
import helmet from 'helmet';

// Aplicar headers de seguridad HTTP
app.use(helmet());

// Configuración adicional si es necesaria
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
  }
}));
```

---

## 🧪 Testing de Seguridad

### Test 1: Verificar que Endpoints Admin Están Protegidos
```bash
# ❌ Esto debe fallar (sin token)
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -d '{"id":"test","name":"Test"}'

# Esperado: 401 No autorizado
```

### Test 2: Verificar CORS
```bash
# Hacer request desde origen no permitido
# Debe rechazar la solicitud
```

### Test 3: Verificar Rate Limiting
```bash
# Hacer 6 requests de login en corto tiempo
# El 6to debe ser rechazado
```

---

## 📋 Checklist de Implementación

- [ ] Crear archivo `.env` con secretos seguros
- [ ] Añadir `.env` a `.gitignore`
- [ ] Instalar nuevas dependencias (jsonwebtoken, helmet, etc.)
- [ ] Implementar JWT en login
- [ ] Actualizar frontend para usar token
- [ ] Proteger endpoints admin con middleware
- [ ] Validar inputs en todos los endpoints
- [ ] Arreglar CORS
- [ ] Añadir rate limiting
- [ ] Usar Helmet para headers
- [ ] Testear cada cambio
- [ ] Hacer commit: `git commit -m "feat: Implement security improvements"`

---

## ⚠️ Pasos Adicionales para Producción

1. **HTTPS Obligatorio** - Usar Nginx con certificado SSL
2. **Base de Datos No Expuesta** - Remover puerto 3306 de docker-compose
3. **Logging de Seguridad** - Registrar intentos fallidos, cambios de datos
4. **Backup de BD** - Configurar backups automáticos
5. **Monitoreo** - Alertas de errores y actividad sospechosa
6. **WAF** - Considerar un Web Application Firewall

---

**Próximo paso:** Empezar con Paso 1 (Configuración Inicial)

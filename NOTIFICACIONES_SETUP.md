# 🎯 UrbanGoal - Guía de Configuración de Notificaciones

## ✅ Cambios Completados

### 1. **Frontend Updates** ✨
- ✅ **Botón de Login Removido**: Ya no aparece el botón "Ingresar" en el header
- ✅ **Admin Links Ocultos**: Se eliminó el acceso directo a admin panel
- ✅ **Branding Actualizado**: 
  - KICKSTORE → URBANGOAL en todos los títulos SEO
  - Todas las páginas (Index, About, Cart, Checkout, etc.)
  - Footer ahora muestra "Urban**Goal**"
- ✅ **Contacto Actualizado**:
  - WhatsApp: **55 7475 6704** (México CDMX)
  - Email: **ncruzm2002@gmail.com**
  - Localización: Mexico City, CDMX

### 2. **Backend Services Instalados** 🚀
- ✅ **nodemailer** v7.0.12 - Para envío de emails
- ✅ **twilio** - Para notificaciones por WhatsApp
- ✅ **dotenv** - Para variables de entorno

### 3. **Nuevos Módulos de Servicio** 📧
- `email-service.js` - Envía confirmaciones de orden por email
- `whatsapp-service.js` - Envía confirmaciones por WhatsApp (con Twilio)

### 4. **Integración en Orden** 📦
El endpoint `POST /api/orders` ahora:
1. Crea la orden en BD
2. Envía email de confirmación al cliente
3. Envía WhatsApp de confirmación al cliente (si está configurado)
4. Notifica al admin por email
5. Notifica al admin por WhatsApp (si está configurado)

---

## ⚙️ Configuración Requerida

### **Para Email (GMAIL SMTP)**

1. **Habilitar 2FA en tu cuenta Google:**
   - Ir a: https://myaccount.google.com/security
   - Activar "Verificación de 2 pasos"

2. **Generar "Contraseña de aplicación":**
   - https://myaccount.google.com/apppasswords
   - Seleccionar: Mail + Windows Computer (o tu dispositivo)
   - Copiar la contraseña generada (16 caracteres)

3. **Agregar a `.env` del backend:**
   ```bash
   EMAIL_USER=ncruzm2002@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # La contraseña de 16 caracteres
   ADMIN_EMAIL=ncruzm2002@gmail.com
   ```

4. **Reiniciar backend:**
   ```bash
   docker-compose restart urbangoal-backend-1
   ```

### **Para WhatsApp (TWILIO - Opcional pero Recomendado)**

1. **Crear cuenta en Twilio:**
   - https://www.twilio.com/
   - Registrarse (obtienen $10 USD de crédito gratis)
   - Verificar número de teléfono

2. **Obtener credenciales:**
   - Dashboard → Account Info → Account SID
   - Dashboard → Auth Token

3. **Generar número de WhatsApp de prueba:**
   - Console → Messaging → Try it out → Send a WhatsApp Message
   - Se te asignará un número de prueba (ej: whatsapp:+14155238886)

4. **Agregar a `.env`:**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Tu número de prueba
   ```

5. **Obtener número comercial (opcional - de pago):**
   - Una vez tengas presupuesto, solicitar número de WhatsApp Business
   - Costo: ~$0.05 USD por mensaje

6. **Reiniciar backend:**
   ```bash
   docker-compose restart urbangoal-backend-1
   ```

---

## 🧪 Pruebas

### Probar Email:
```bash
# En el navegador:
# 1. Ir a http://localhost:3000
# 2. Completar un pedido
# 3. Revisar email en ncruzm2002@gmail.com
```

### Probar WhatsApp:
```bash
# Si Twilio está configurado:
# 1. Ir a http://localhost:3000
# 2. Completar un pedido
# 3. Revisar WhatsApp en tu número
```

### Ver logs:
```bash
# Ver logs del backend:
docker logs urbangoal-backend-1 -f

# Ver logs del MySQL:
docker logs urbangoal-mysql-1
```

---

## 📊 Estructura de Notificaciones

### Email al Cliente:
```
✉️ Asunto: Orden Confirmada - UrbanGoal #ORDER_ID

Contiene:
- Confirmación de orden
- Número de orden
- Detalle de productos (nombre, talla, cantidad, precio)
- Total
- Enlace a WhatsApp para contactar
- Pasos siguientes
```

### WhatsApp al Cliente:
```
📱 Mensaje:

¡Hola [Cliente]! 🎉

Tu orden #ORDER_ID ha sido confirmada.

Total: $PRECIO

Proximamente te coordinaremos la entrega.

¿Preguntas? Contactanos aquí. 📱
```

### Email al Admin:
```
✉️ Asunto: Nueva Orden - UrbanGoal #ORDER_ID

Contiene:
- Número de orden
- Nombre del cliente
- Teléfono del cliente
- Total
- Enlace al panel de administración
```

### WhatsApp al Admin:
```
📱 Mensaje:

📦 Nueva orden recibida!

Cliente: [Nombre]
Teléfono: [Número]
Orden: #ORDER_ID
Total: $PRECIO

Accede al panel para más detalles.
```

---

## 🔒 Variables de Entorno (.env)

```env
# Base de Datos
DB_HOST=mysql
DB_USER=urbangoal
DB_PASSWORD=urbangoalpass
DB_NAME=urbangoal_db

# Servidor
PORT=4000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

# Email (Gmail SMTP)
EMAIL_USER=ncruzm2002@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # ← IMPORTANTE: Contraseña de App
ADMIN_EMAIL=ncruzm2002@gmail.com

# WhatsApp (Twilio - Opcional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Seguridad
JWT_SECRET=supersecret123456789
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 📝 Notas Importantes

1. **Sin Email/WhatsApp**: La aplicación funciona perfectamente sin estas configuraciones. Los servicios se inicializan de forma segura.

2. **Credenciales Seguras**: 
   - NUNCA commits `.env` a git
   - Ya está en `.gitignore`
   - Usar `.env.example` como referencia

3. **Límites de Twilio**:
   - Versión prueba: Solo enviar a números verificados
   - Versión comercial: Números ilimitados

4. **Gmail - Cambio Importante**:
   - Google ya NO permite contraseñas directas
   - OBLIGATORIO usar "Contraseña de aplicación"

5. **Escalabilidad**:
   - Para muchos emails: Usar SendGrid, Mailgun, AWS SES
   - Para muchos WhatsApp: Usar API oficial de WhatsApp Business

---

## 🚀 Próximos Pasos Recomendados

1. Configurar Email (es gratis y toma 5 minutos)
2. Configurar Twilio para WhatsApp (costo mínimo, mejor experiencia)
3. Implementar panel de admin para ver órdenes
4. Agregar sistema de pagos online con Mercado Pago
5. Proteger endpoints de admin con JWT

---

## 💡 Comandos Útiles

```bash
# Verificar si .env está bien configurado:
docker-compose exec urbangoal-backend-1 node -c "console.log('Config OK')"

# Ver si emails se envían correctamente:
docker logs urbangoal-backend-1 | grep -i "email\|whatsapp"

# Reiniciar solo backend:
docker-compose restart urbangoal-backend-1

# Reconstruir todo:
docker-compose down && docker-compose up -d --build

# Ver variables de entorno en contenedor:
docker-compose exec urbangoal-backend-1 env | grep -E "EMAIL|TWILIO"
```

---

**¡Felicidades! Tu UrbanGoal está lista para recibir órdenes con notificaciones automáticas! 🎉**

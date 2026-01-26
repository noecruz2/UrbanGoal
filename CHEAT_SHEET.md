# 🚀 UrbanGoal - Cheat Sheet

## URLs Importantes
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **MySQL**: localhost:3306

## Credenciales Base de Datos
```
Host: mysql (en Docker) / localhost (local)
Usuario: urbangoal
Contraseña: urbangoalpass
Base de datos: urbangoal_db
```

## Archivos Clave a Actualizar

### 1. Email Configuration (5 min)
Archivo: `UrbanGoal_BackEnd/.env`

```env
EMAIL_USER=ncruzm2002@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # ← Obtener en https://myaccount.google.com/apppasswords
ADMIN_EMAIL=ncruzm2002@gmail.com
```

### 2. WhatsApp Configuration (10 min)
Archivo: `UrbanGoal_BackEnd/.env`

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

Obtener en: https://www.twilio.com

## Comandos Útiles

### Reiniciar Backend
```bash
docker-compose restart urbangoal-backend-1
```

### Ver logs del backend
```bash
docker logs urbangoal-backend-1 -f
```

### Reconstruir todo
```bash
docker-compose down && docker-compose up -d --build
```

### Conectar a MySQL
```bash
docker-compose exec urbangoal-mysql-1 mysql -u urbangoal -p urbangoal_db
# Contraseña: urbangoalpass
```

## Información de Negocio

### UrbanGoal
- 📍 **Ubicación**: Mexico City, CDMX
- 📱 **WhatsApp**: 55 7475 6704
- 📧 **Email**: ncruzm2002@gmail.com

## Archivos Documentación

1. **RESUMEN_FINAL.txt** - Resumen completo
2. **NOTIFICACIONES_SETUP.md** - Guía detallada
3. **CAMBIOS_REALIZADOS.md** - Cambios técnicos
4. **QUICK_START.sh** - Script interactivo

## Verificación Rápida

### ¿Está el frontend funcionando?
```bash
curl http://localhost:3000 | grep -i "urbangoal"
```

### ¿Está el backend funcionando?
```bash
curl http://localhost:4000
# Debe mostrar: "UrbanGoal Backend funcionando"
```

### ¿Están los contenedores levantados?
```bash
docker ps
# Debe mostrar 3 contenedores: frontend, backend, mysql
```

## Flujo de una Orden Ahora

```
Cliente completa pedido
       ↓
POST /api/orders
       ↓
1. Guardar orden en BD
2. Actualizar stock
3. [ASYNC] Enviar email al cliente
4. [ASYNC] Enviar WhatsApp al cliente
5. [ASYNC] Email al admin
6. [ASYNC] WhatsApp al admin
       ↓
Devolver confirmación (201)
       ↓
Cliente ve su número de orden
```

## Checklist Pre-Producción

- [ ] Email configurado y probado
- [ ] WhatsApp configurado y probado
- [ ] Se probó una orden completa
- [ ] Se recibió email de confirmación
- [ ] Se recibió WhatsApp de confirmación
- [ ] Base de datos está en servidor externo
- [ ] Variables de entorno están en producción
- [ ] CORS está configurado para tu dominio

## Troubleshooting

### Email no se envía
1. Verificar que EMAIL_PASSWORD está correcto
2. Ver logs: `docker logs urbangoal-backend-1 | grep -i email`
3. Verificar que Gmail 2FA está habilitado

### WhatsApp no se envía
1. Verificar que TWILIO_ACCOUNT_SID está correcto
2. Ver logs: `docker logs urbangoal-backend-1 | grep -i whatsapp`
3. Verificar que tienes crédito en Twilio

### La orden no se crea
1. Verificar conexión a BD: `docker logs urbangoal-mysql-1`
2. Verificar que `order_items` table existe
3. Ver logs del backend: `docker logs urbangoal-backend-1`

## Enlaces Útiles

- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [Google 2FA](https://myaccount.google.com/security)
- [Twilio Console](https://www.twilio.com/console)
- [Docker Docs](https://docs.docker.com/)

---

**Última actualización**: 2024
**Versión**: 1.0 - Funcional

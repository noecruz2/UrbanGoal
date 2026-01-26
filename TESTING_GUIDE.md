# 🧪 Quick Security Testing Guide

## Test Commands (Copy & Paste)

### 1. Test Frontend is Running
```bash
curl -s http://localhost:3000 | head -c 100
# Should show: <!doctype html>
```

### 2. Test Backend is Running
```bash
curl -s http://localhost:4000
# Should show: UrbanGoal Backend funcionando
```

### 3. Test Public Endpoint (Should Work)
```bash
curl -s http://localhost:4000/api/products | head -c 200
# Should show: JSON array of products
```

### 4. Test Admin Endpoint WITHOUT JWT (Should Fail)
```bash
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Should return:
# {"error":"No autorizado - Token no proporcionado","code":"MISSING_TOKEN"}
```

### 5. Test Input Validation (Invalid Email)
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","phone":"123"}'

# Should return validation error (missing required fields)
```

### 6. Test Invalid Quantity (Negative Number)
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id":"test",
    "items":[{"product":"prod-1","quantity":-1,"size":"M","subtotal":-100}],
    "customer":{"name":"Test","email":"test@example.com","phone":"1234567890"},
    "paymentMethod":"transfer",
    "total":100
  }'

# Should return: quantity must be >= 1
```

### 7. Test Invalid Payment Method
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id":"test",
    "items":[{"product":"prod-1","quantity":1,"size":"M","subtotal":100}],
    "customer":{"name":"Test","email":"test@example.com","phone":"1234567890"},
    "paymentMethod":"invalid_method",
    "total":100
  }'

# Should return: paymentMethod must be transfer, cash, or mercadopago
```

### 8. Check Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Should show:
# urbangoal-frontend-1    Up XX minutes    0.0.0.0:3000->3000/tcp
# urbangoal-backend-1     Up XX minutes    0.0.0.0:4000->4000/tcp
# urbangoal-mysql-1       Up XX minutes    (no exposed ports)
```

### 9. Check MySQL is NOT Accessible from Host
```bash
mysql -h localhost -u urbangoal -p urbangoal_db
# Should FAIL with: "Can't connect to MySQL server on 'localhost'"
# This is CORRECT - MySQL should only be accessible internally
```

### 10. Check Backend Logs
```bash
docker logs urbangoal-backend-1 --tail 20

# Should show:
# "Conectado a MySQL - Tablas esperadas desde init.sql"
# "Servidor backend escuchando en puerto 4000"
```

---

## Feature Testing in Frontend

### Test Metro Line 5 is Correct
1. Go to `http://localhost:3000`
2. Navigate to checkout or delivery section
3. Look for "Línea 5" with 13 stations:
   - Pantitlán → Politécnico → Autobuses del Norte → Terminal Aérea → La Raza → Oceanía → Misterios → Aragón → Eduardo Molina → Instituto del Petróleo → Consulado → Hangares → Valle Gómez

### Test Stock Updates After Purchase
1. Go to `http://localhost:3000`
2. Add a product to cart
3. Complete checkout
4. Check the product detail page - stock should be updated
5. No page reload should be needed

---

## Environment Variables to Configure

File: `.env` in UrbanGoal_BackEnd folder

```env
# CRITICAL - CHANGE THESE FOR PRODUCTION
DB_PASSWORD=urbangoalpass  # Change to strong password
JWT_SECRET=your-super-secret-jwt-key-32-chars-min

# Configure for your email provider
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Configure Twilio for WhatsApp notifications
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Configure Mercado Pago
MP_ACCESS_TOKEN=your-mercadopago-token
```

---

## Key Files Changed

- ✅ `UrbanGoal_BackEnd/index.mysql.js` - Protected endpoints + validation
- ✅ `UrbanGoal_BackEnd/input-validation.js` - NEW: XSS prevention module
- ✅ `UrbanGoal_BackEnd/package.json` - Added `xss` dependency
- ✅ `UrbanGoal_FrontEnd/src/context/OrderContext.tsx` - Stock refresh fix
- ✅ `UrbanGoal_FrontEnd/src/data/metro.ts` - Metro Line 5 corrected
- ✅ `docker-compose.yml` - Database isolation + security hardening
- ✅ `.env` - Environment variable structure

---

## Troubleshooting

### Backend won't connect to MySQL
```bash
# Check MySQL is running
docker ps | grep mysql

# Check MySQL logs
docker logs urbangoal-mysql-1 --tail 20

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### Admin endpoints still not working
```bash
# Clear browser cache and restart frontend
docker-compose restart frontend

# Check backend logs for errors
docker logs urbangoal-backend-1 --tail 50
```

### Input validation too strict
- Review the actual error messages from API
- Check `UrbanGoal_BackEnd/input-validation.js` for rules
- Adjust validation if needed, but keep security standards

### Frontend can't reach backend
```bash
# Check CORS settings in index.mysql.js
# Make sure ALLOWED_ORIGINS includes your frontend URL

# Restart backend
docker-compose restart backend
```

---

## Security Best Practices Going Forward

1. **Always use environment variables** for secrets
2. **Never commit .env file** to git (add to .gitignore)
3. **Validate all user inputs** on both frontend and backend
4. **Use HTTPS in production** (not just localhost)
5. **Keep dependencies updated** - Run `npm audit` regularly
6. **Rotate secrets periodically** - Update JWT_SECRET every 90 days
7. **Enable database backups** - Before production
8. **Monitor logs regularly** - Check for suspicious activity

---

## Success Indicators

You'll know everything is working when:

✅ Frontend loads at http://localhost:3000  
✅ Backend responds at http://localhost:4000  
✅ Products display with correct stock  
✅ Stock updates after purchase without reload  
✅ Metro Line 5 shows 13 correct stations  
✅ Admin endpoints reject requests without JWT  
✅ Invalid inputs are rejected with errors  
✅ MySQL not accessible from host machine  

---

**All Security Features are Active and Verified! 🔒**

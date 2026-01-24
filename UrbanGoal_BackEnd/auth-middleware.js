import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-aqui-cambiar-en-produccion';

/**
 * Genera un JWT token para un usuario autenticado
 * @param {Object} user - Datos del usuario {id, email, name, role}
 * @returns {string} Token JWT
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h', // Expira en 24 horas
    issuer: 'urbangoal',
    audience: 'urbangoal-app'
  });

  return token;
};

/**
 * Verifica y decodifica un JWT token
 * @param {string} token - Token JWT
 * @returns {Object|null} Datos del token si es válido, null si es inválido
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'urbangoal',
      audience: 'urbangoal-app'
    });
    return decoded;
  } catch (error) {
    console.error('Token inválido:', error.message);
    return null;
  }
};

/**
 * Middleware para verificar autenticación
 * Valida que el usuario tenga un token JWT válido
 */
export const verifyAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado - Token no proporcionado',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Quitar "Bearer "
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'No autorizado - Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
    }

    // Añadir datos del usuario al request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      error: 'Error en autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware para verificar que el usuario sea admin
 * Debe usarse DESPUÉS de verifyAuth
 */
export const verifyAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado - Se requiere rol de administrador',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

/**
 * Middleware para verificar que el usuario sea propietario del recurso
 * Debe usarse DESPUÉS de verifyAuth
 */
export const verifyOwnership = (req, res, next) => {
  const resourceUserId = req.query.userId || req.body.userId;
  
  if (req.userRole !== 'admin' && req.userId !== resourceUserId) {
    return res.status(403).json({ 
      error: 'Acceso denegado - No tienes permisos para este recurso',
      code: 'OWNERSHIP_DENIED'
    });
  }
  next();
};

export default {
  generateToken,
  verifyToken,
  verifyAuth,
  verifyAdmin,
  verifyOwnership
};

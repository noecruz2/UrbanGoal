import validator from 'validator';
import xss from 'xss';

/**
 * Sanitización y validación de inputs de seguridad
 */
export const sanitizeInputs = (req, res, next) => {
  // Sanitizar todos los inputs para prevenir XSS
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitizar query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Validar tamaño de payload
  if (req.get('content-length') > 50 * 1024 * 1024) { // 50MB máximo
    return res.status(413).json({ error: 'Payload too large' });
  }
  
  next();
};

/**
 * Recursivamente sanitiza un objeto
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
}

/**
 * Sanitiza un valor string para prevenir XSS
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remover caracteres de control
  let sanitized = value.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Sanitizar con xss library
  sanitized = xss(sanitized, {
    whiteList: {}, // No permitir tags HTML
    stripIgnoredTag: true,
  });
  
  return sanitized;
}

/**
 * Validador de email mejorado
 */
export const validateEmail = (email) => {
  const sanitized = email.trim().toLowerCase();
  const isValid = validator.isEmail(sanitized);
  
  return {
    isValid,
    error: !isValid ? 'Email inválido' : null,
    value: sanitized,
  };
};

/**
 * Validador de teléfono
 */
export const validatePhone = (phone) => {
  const sanitized = phone.replace(/\D/g, ''); // Solo números
  const isValid = sanitized.length >= 10 && sanitized.length <= 15;
  
  return {
    isValid,
    error: !isValid ? 'Teléfono inválido (10-15 dígitos)' : null,
    value: sanitized,
  };
};

/**
 * Validador de URL
 */
export const validateUrl = (url) => {
  const isValid = validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  });
  
  return {
    isValid,
    error: !isValid ? 'URL inválida' : null,
    value: url,
  };
};

/**
 * Validador de contraseña
 */
export const validatePassword = (password) => {
  // Mínimo 6 caracteres
  const isValid = password && password.length >= 6;
  
  return {
    isValid,
    error: !isValid ? 'Contraseña debe tener mínimo 6 caracteres' : null,
    value: password,
  };
};

/**
 * Validador de número
 */
export const validateNumber = (value, min = 0, max = null) => {
  const num = Number(value);
  const isValid = !isNaN(num) && num >= min && (max === null || num <= max);
  
  return {
    isValid,
    error: !isValid ? `Número inválido (mín: ${min}${max ? `, máx: ${max}` : ''})` : null,
    value: num,
  };
};

export default {
  sanitizeInputs,
  validateEmail,
  validatePhone,
  validateUrl,
  validatePassword,
  validateNumber,
};

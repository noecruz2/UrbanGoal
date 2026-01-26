import validator from 'validator';

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email es requerido' };
  }

  const trimmed = email.trim();
  
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email muy largo (máximo 254 caracteres)' };
  }

  if (!validator.isEmail(trimmed)) {
    return { isValid: false, error: 'Email inválido' };
  }

  return { isValid: true, error: null, value: trimmed };
};

/**
 * Valida una contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Contraseña es requerida' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Contraseña debe tener mínimo 6 caracteres' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Contraseña muy larga (máximo 128 caracteres)' };
  }

  return { isValid: true, error: null, value: password };
};

/**
 * Valida un nombre
 * @param {string} name - Nombre a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Nombre es requerido' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Nombre debe tener mínimo 2 caracteres' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Nombre muy largo (máximo 100 caracteres)' };
  }

  // Sanitizar caracteres especiales peligrosos
  if (/<|>|script|onclick/i.test(trimmed)) {
    return { isValid: false, error: 'Nombre contiene caracteres inválidos' };
  }

  return { isValid: true, error: null, value: trimmed };
};

/**
 * Valida un slug (para categorías)
 * @param {string} slug - Slug a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, error: 'Slug es requerido' };
  }

  const trimmed = slug.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Slug solo puede contener letras minúsculas, números y guiones' };
  }

  if (trimmed.length > 200) {
    return { isValid: false, error: 'Slug muy largo (máximo 200 caracteres)' };
  }

  return { isValid: true, error: null, value: trimmed };
};

/**
 * Valida un teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: true, error: null, value: null }; // Opcional
  }

  if (typeof phone !== 'string') {
    return { isValid: false, error: 'Teléfono debe ser texto' };
  }

  const trimmed = phone.trim();

  // Solo números, + y espacios
  if (!/^[\d\s+\-()]+$/.test(trimmed)) {
    return { isValid: false, error: 'Teléfono inválido' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Teléfono muy largo' };
  }

  return { isValid: true, error: null, value: trimmed };
};

/**
 * Valida un precio (número decimal)
 * @param {number|string} price - Precio a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validatePrice = (price) => {
  if (price === null || price === undefined) {
    return { isValid: false, error: 'Precio es requerido' };
  }

  const numPrice = parseFloat(price);

  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Precio debe ser un número' };
  }

  if (numPrice < 0) {
    return { isValid: false, error: 'Precio no puede ser negativo' };
  }

  if (numPrice > 999999.99) {
    return { isValid: false, error: 'Precio muy alto' };
  }

  // Máximo 2 decimales
  if (!/^\d+(\.\d{1,2})?$/.test(numPrice.toString())) {
    return { isValid: false, error: 'Precio debe tener máximo 2 decimales' };
  }

  return { isValid: true, error: null, value: numPrice };
};

/**
 * Valida una descripción
 * @param {string} description - Descripción a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateDescription = (description) => {
  if (!description || typeof description !== 'string') {
    return { isValid: false, error: 'Descripción es requerida' };
  }

  const trimmed = description.trim();

  if (trimmed.length < 10) {
    return { isValid: false, error: 'Descripción debe tener mínimo 10 caracteres' };
  }

  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Descripción muy larga (máximo 2000 caracteres)' };
  }

  return { isValid: true, error: null, value: trimmed };
};

/**
 * Valida una cantidad (número entero positivo)
 * @param {number|string} quantity - Cantidad a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateQuantity = (quantity) => {
  if (quantity === null || quantity === undefined) {
    return { isValid: false, error: 'Cantidad es requerida' };
  }

  const num = parseInt(quantity, 10);

  if (isNaN(num)) {
    return { isValid: false, error: 'Cantidad debe ser un número entero' };
  }

  if (num < 1) {
    return { isValid: false, error: 'Cantidad debe ser mayor que 0' };
  }

  if (num > 999) {
    return { isValid: false, error: 'Cantidad no puede ser mayor que 999' };
  }

  return { isValid: true, error: null, value: num };
};

/**
 * Valida un UUID
 * @param {string} uuid - UUID a validar
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') {
    return { isValid: false, error: 'ID es requerido' };
  }

  if (!validator.isUUID(uuid)) {
    return { isValid: false, error: 'ID no es válido' };
  }

  return { isValid: true, error: null, value: uuid };
};

/**
 * Sanitiza un string (remueve caracteres peligrosos)
 * @param {string} input - String a sanitizar
 * @returns {string} String sanitizado
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  return validator.escape(input)
    .trim()
    .slice(0, 1000); // Máximo 1000 caracteres
};

/**
 * Valida un array de tallas
 * @param {Array} sizes - Array de tallas
 * @returns {Object} {isValid: boolean, error: string|null}
 */
export const validateSizes = (sizes) => {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return { isValid: false, error: 'Debe tener al menos una talla' };
  }

  const validSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '32', '34', '36', '38', '40', '42', '44', '46'];

  for (const size of sizes) {
    if (!size.value || !validSizes.includes(size.value)) {
      return { isValid: false, error: `Talla inválida: ${size.value}` };
    }

    const stock = parseInt(size.stock, 10);
    if (isNaN(stock) || stock < 0) {
      return { isValid: false, error: 'Stock debe ser un número no negativo' };
    }
  }

  return { isValid: true, error: null, value: sizes };
};

export default {
  validateEmail,
  validatePassword,
  validateName,
  validateSlug,
  validatePhone,
  validatePrice,
  validateDescription,
  validateQuantity,
  validateUUID,
  sanitizeString,
  validateSizes
};

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.memoryStorage();

// Filtro de archivos - solo imágenes
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se aceptan imágenes (JPEG, PNG, WebP, GIF)'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

/**
 * Procesa y guarda imágenes subidas
 * @param {Array} files - Array de archivos subidos (req.files)
 * @returns {Promise<Array>} Array de URLs de imágenes guardadas
 */
export async function processAndSaveImages(files) {
  if (!files || files.length === 0) {
    return [];
  }

  const imageUrls = [];

  for (const file of files) {
    try {
      console.log(`[ImageUpload] Procesando archivo: ${file.originalname} (${file.size} bytes)`);
      
      // Generar nombre de archivo único
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const filename = `product-${timestamp}-${random}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      console.log(`[ImageUpload] Guardando en: ${filepath}`);

      // Procesar imagen: redimensionar y optimizar como JPEG
      await sharp(file.buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality: 90, progressive: true })
        .toFile(filepath);

      console.log(`[ImageUpload] Imagen guardada exitosamente`);

      // Guardar también una versión thumbnail (300x300)
      const thumbFilename = `product-${timestamp}-${random}-thumb.jpg`;
      const thumbPath = path.join(uploadsDir, thumbFilename);
      await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality: 85 })
        .toFile(thumbPath);

      // Agregar URL relativa
      const imageUrl = `/uploads/products/${filename}`;
      imageUrls.push({
        url: imageUrl,
        thumbnail: `/uploads/products/${thumbFilename}`,
        filename: filename
      });

      console.log(`[ImageUpload] URL agregada: ${imageUrl}`);

    } catch (err) {
      console.error(`[ImageUpload] Error procesando ${file.originalname}:`, err);
      throw new Error(`Error procesando imagen: ${err.message}`);
    }
  }

  console.log(`[ImageUpload] Total de imágenes procesadas: ${imageUrls.length}`);
  return imageUrls;
}

/**
 * Elimina imágenes del servidor
 * @param {Array<string>} filenames - Array de nombres de archivo a eliminar
 */
export function deleteImages(filenames) {
  if (!filenames || !Array.isArray(filenames)) {
    return;
  }

  filenames.forEach(filename => {
    try {
      const filepath = path.join(uploadsDir, filename);
      
      // Verificar que el archivo está dentro del directorio permitido
      if (!filepath.startsWith(uploadsDir)) {
        console.warn(`Intento de acceso fuera de directorio: ${filepath}`);
        return;
      }

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`Imagen eliminada: ${filename}`);
      }
    } catch (err) {
      console.error(`Error eliminando imagen ${filename}:`, err);
    }
  });
}

/**
 * Middleware para subir una sola imagen
 */
export const uploadSingleImage = upload.single('image');

/**
 * Middleware para subir múltiples imágenes
 */
export const uploadMultipleImages = upload.array('images', 10); // Máximo 10 imágenes

export default upload;

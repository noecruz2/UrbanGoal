import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Número de prueba de Twilio

let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

/**
 * Envía notificación de orden por WhatsApp
 * @param {string} customerPhone - Número de teléfono del cliente (formato: 525574756704)
 * @param {string} customerName - Nombre del cliente
 * @param {string} orderId - ID de la orden
 * @param {number} total - Total de la orden
 */
export async function sendOrderNotificationWhatsApp(customerPhone, customerName, orderId, total) {
  // Si no está configurado Twilio, devolver success para no bloquear la orden
  if (!client) {
    console.log('⚠️ Twilio no está configurado. WhatsApp no enviado.');
    return { success: true, message: 'Twilio no configurado - ignorado' };
  }

  try {
    // Formatear el número si es necesario
    let formattedPhone = customerPhone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    const message = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:${formattedPhone}`,
      body: `¡Hola ${customerName}! 🎉\n\nTu orden #${orderId} ha sido confirmada.\n\nTotal: $${total}\n\nProximamente te coordinaremos la entrega. \n\n¿Preguntas? Contactanos aquí. 📱`,
    });

    console.log('WhatsApp enviado exitosamente:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (err) {
    console.error('Error al enviar WhatsApp:', err);
    // No bloquear la orden si falla WhatsApp
    return { success: false, error: err.message };
  }
}

/**
 * Envía notificación al admin por WhatsApp
 * @param {string} adminPhone - Número de teléfono del admin (formato: 525574756704)
 * @param {string} customerName - Nombre del cliente
 * @param {string} orderId - ID de la orden
 * @param {string} customerPhone - Teléfono del cliente
 * @param {number} total - Total de la orden
 */
export async function sendAdminNotificationWhatsApp(adminPhone, customerName, orderId, customerPhone, total) {
  if (!client) {
    return { success: true, message: 'Twilio no configurado - ignorado' };
  }

  try {
    let formattedAdminPhone = adminPhone;
    if (!formattedAdminPhone.startsWith('+')) {
      formattedAdminPhone = '+' + formattedAdminPhone;
    }

    const message = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: `whatsapp:${formattedAdminPhone}`,
      body: `📦 Nueva orden recibida!\n\nCliente: ${customerName}\nTeléfono: ${customerPhone}\nOrden: #${orderId}\nTotal: $${total}\n\nAccede al panel para más detalles.`,
    });

    console.log('WhatsApp admin enviado:', message.sid);
    return { success: true, messageSid: message.sid };
  } catch (err) {
    console.error('Error al enviar WhatsApp admin:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verifica si Twilio está configurado
 */
export function isTwilioConfigured() {
  return !!(accountSid && authToken);
}

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de transportador de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ncruzm2002@gmail.com',
    pass: process.env.EMAIL_PASSWORD || '', // Usar contraseña de app
  },
});

/**
 * Envía email de confirmación de orden
 * @param {string} customerEmail - Email del cliente
 * @param {string} customerName - Nombre del cliente
 * @param {string} orderId - ID de la orden
 * @param {array} items - Items de la orden
 * @param {number} total - Total de la orden
 * @param {string} whatsapp - Número de WhatsApp para contacto
 */
export async function sendOrderConfirmation(customerEmail, customerName, orderId, items, total, whatsapp = '525574756704') {
  try {
    const itemsHtml = items
      .map((item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            ${item.name || 'Producto'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
            ${item.size || 'N/A'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
            ${item.quantity || 1}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
            $${item.priceAtPurchase || 0}
          </td>
        </tr>
      `)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .header { background-color: #005391; color: white; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { margin: 20px 0; }
            .order-info { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .order-info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .total-row { font-weight: bold; font-size: 18px; background-color: #f0f0f0; }
            .button { display: inline-block; padding: 10px 20px; background-color: #005391; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px 10px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Orden Confirmada!</h1>
              <p>Gracias por tu compra en UrbanGoal</p>
            </div>

            <div class="content">
              <p>Hola <strong>${customerName}</strong>,</p>
              <p>Tu orden ha sido recibida y procesada exitosamente. A continuación se muestran los detalles:</p>

              <div class="order-info">
                <p><strong>Número de orden:</strong> ${orderId}</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
              </div>

              <h3>Resumen de la Orden</h3>
              <table>
                <thead>
                  <tr style="background-color: #005391; color: white;">
                    <th style="padding: 8px; text-align: left;">Producto</th>
                    <th style="padding: 8px; text-align: center;">Talla</th>
                    <th style="padding: 8px; text-align: center;">Cantidad</th>
                    <th style="padding: 8px; text-align: right;">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td colspan="3" style="padding: 8px; text-align: right;">Total:</td>
                    <td style="padding: 8px; text-align: right;">$${total}</td>
                  </tr>
                </tbody>
              </table>

              <h3>Próximos Pasos</h3>
              <ol>
                <li>Pronto recibirás confirmación del pago por WhatsApp</li>
                <li>Coordinaremos la dirección y hora de entrega</li>
                <li>Tu pedido será preparado y enviado</li>
              </ol>

              <p><strong>¿Preguntas o cambios?</strong> Contactanos por WhatsApp:</p>
              <a href="https://wa.me/${whatsapp}?text=Hola,%20tengo%20una%20pregunta%20sobre%20mi%20orden%20${orderId}" class="button">
                Contactar por WhatsApp
              </a>

              <div class="footer">
                <p>© 2024 UrbanGoal - Todos los derechos reservados</p>
                <p>Email: ncruzm2002@gmail.com | WhatsApp: ${whatsapp}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'ncruzm2002@gmail.com',
      to: customerEmail,
      subject: `Orden Confirmada - UrbanGoal #${orderId}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de confirmación enviado:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error al enviar email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Envía notificación al administrador
 * @param {string} orderId - ID de la orden
 * @param {string} customerName - Nombre del cliente
 * @param {string} customerPhone - Teléfono del cliente
 * @param {number} total - Total de la orden
 */
export async function sendAdminNotification(orderId, customerName, customerPhone, total) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; }
            .order-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert">
              <h2>¡Nueva Orden Recibida!</h2>
            </div>
            <div class="order-details">
              <p><strong>Orden ID:</strong> ${orderId}</p>
              <p><strong>Cliente:</strong> ${customerName}</p>
              <p><strong>Teléfono:</strong> ${customerPhone}</p>
              <p><strong>Total:</strong> $${total}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
            </div>
            <p>Accede al panel de administración para más detalles.</p>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'ncruzm2002@gmail.com',
      to: process.env.ADMIN_EMAIL || 'ncruzm2002@gmail.com',
      subject: `Nueva Orden - UrbanGoal #${orderId}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de notificación al admin enviado:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error al enviar email de notificación:', err);
    return { success: false, error: err.message };
  }
}

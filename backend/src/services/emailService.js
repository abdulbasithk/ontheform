const sgMail = require('@sendgrid/mail');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Email service configuration
class EmailService {
  constructor() {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    
    if (!sendGridApiKey) {
      console.error('SENDGRID_API_KEY environment variable is required');
      throw new Error('SendGrid credentials are required');
    }

    sgMail.setApiKey(sendGridApiKey);
    
    this.fromEmail = process.env.EMAIL_FROM || 'no-reply@sodtix.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'OnTheForm';
    
    console.log('📧 Email service initialized with SendGrid');
    console.log(`📧 From email: ${this.fromEmail}`);
  }

  // Generate QR code as buffer for email attachment
  async generateQRCodeBuffer(data) {
    try {
      const qrCodeBuffer = await QRCode.toBuffer(data, {
        type: 'png',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeBuffer;
    } catch (error) {
      console.error('Error generating QR code buffer:', error);
      throw error;
    }
  }

  // Generate QR code as data URL for inline display
  async generateQRCodeDataURL(data) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code data URL:', error);
      throw error;
    }
  }

  // Send submission confirmation email
  async sendSubmissionConfirmation({
    recipientEmail,
    formTitle,
    submissionId,
    showQrCode = false,
    bannerUrl = null
  }) {

    try {
      let qrCodeImage = '';

      let qrCodeUrl = null;
      
      // Generate QR code if requested
      if (showQrCode) {
        try {
          console.log('Generating QR code for submission:', submissionId);
          
          // Create QR code file in uploads directory (same as banners)
          const uploadsDir = path.join(__dirname, '../../uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          const qrCodeFileName = `qr-${submissionId}-${Date.now()}.png`;
          const qrCodeFilePath = path.join(uploadsDir, qrCodeFileName);
          
          // Generate QR code and save to uploads directory
          await QRCode.toFile(qrCodeFilePath, submissionId, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          console.log('QR code file created successfully:', qrCodeFilePath);
          
          // Create public URL for QR code (same pattern as banners)
          qrCodeUrl = `/api/forms/uploads/${qrCodeFileName}`;
          const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
          const absoluteQrCodeUrl = `${baseUrl}${qrCodeUrl}`;
          
          // Update email content to show QR code image inline
          qrCodeImage = `
            <div style="text-align: center; margin: 20px 0;">
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block;">
                <img src="${absoluteQrCodeUrl}" alt="Submission QR Code" style="display: block; margin: 0 auto; max-width: 200px; height: auto;" />
              </div>
            </div>
          `;
        } catch (error) {
          console.error('Error generating QR code file:', error);
          qrCodeImage = `
            <div style="text-align: center; margin: 20px 0;">
              <p style="color: #ef4444; font-size: 14px;">QR code could not be generated for submission: <strong>${submissionId}</strong></p>
            </div>
          `;
        }
      }

      // Include banner if available
      let bannerImage = '';
      if (bannerUrl) {
        // Convert relative URL to absolute URL for email
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        const absoluteBannerUrl = `${baseUrl}${bannerUrl}`;
        bannerImage = `
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${absoluteBannerUrl}" alt="Form Banner" style="max-width: 100%; height: auto; border-radius: 8px;" />
          </div>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Form Submission Confirmation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; margin-top: 20px;">
          <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
            ${bannerImage}
            
            <div>
              <div style="margin-bottom: 30px;">
                <p style="color: #374151; margin: 0 0 10px 0; font-size: 16px; font-weight: 700;">Halo,</p>
                <p style="color: #374151; margin: 0; font-size: 16px;">RSVP kamu sudah kami terima - and you're officially on the list. ✨</p>
              </div>

              <div style="margin-bottom: 24px;">
                <p style="color: #374151; margin: 0 0 16px 0; font-size: 16px;">Sampai bertemu di Halal Bihalal SOD Festival, sebuah gathering intimate yang kami siapkan khusus untuk kamu.</p>
                <p style="color: #374151; margin: 0 0 14px 0; font-size: 16px; font-weight: 600;">Berikut detailnya:</p>
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px;">
                  <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;">📅 Jum'at, 27 Maret 2026</p>
                  <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;">🕒 Open House at 17.00 WIB</p>
                  <p style="margin: 0 0 8px 0; color: #111827; font-size: 15px;">📍 Jl. Darmahusada Indah Blok AB no. 308</p>
                  <p style="margin: 0; color: #111827; font-size: 15px;">👕 White, Beige</p>
                </div>
              </div>

              ${qrCodeImage}

              <div style="margin-top: 8px; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">Mohon untuk menjaga detail acara ini tetap privat. Undangan ini bersifat personal dan tidak untuk dibagikan ke pihak lain di luar tamu yang terdaftar. Kami ingin menjaga suasana tetap hangat, dekat, dan eksklusif.</p>
                <p style="color: #374151; font-size: 15px; margin: 10px 0 0 0;">🎟️ Simpan barcode ini untuk registrasi ulang saat kedatangan. See you!</p>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #374151; font-size: 14px; margin: 0; font-weight: 600;">Salam cinta,</p>
                <p style="color: #111827; font-size: 14px; margin: 4px 0 0 0; font-weight: 700;">TIMSOD</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const [response] = await sgMail.send({
        to: recipientEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: `Your RSVP is Confirmed - ${formTitle}`,
        html: htmlContent
      });

      const messageId = response?.headers?.['x-message-id'] || response?.headers?.['X-Message-Id'] || 'unknown';

      console.log('📧 Email sent successfully via SendGrid:', {
        status: response?.statusCode,
        recipient: recipientEmail,
        messageId
      });

      // QR code files are now permanent public files, no cleanup needed

      return {
        success: true,
        messageId,
        status: response?.statusCode || 202,
        data: response?.headers || {}
      };
    } catch (error) {
      console.error('Error sending submission confirmation email:', {
        error: error?.response?.body || error.message,
        recipient: recipientEmail,
        formTitle,
        submissionId
      });
      
      // QR code files are now permanent public files, no cleanup needed
      
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();

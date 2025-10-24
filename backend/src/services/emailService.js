const axios = require('axios');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Email service configuration
class EmailService {
  constructor() {
    // Get email provider from environment (default to kirim for backward compatibility)
    this.provider = (process.env.EMAIL_PROVIDER || 'kirim').toLowerCase();
    
    if (!['sendgrid', 'kirim'].includes(this.provider)) {
      throw new Error(`Invalid EMAIL_PROVIDER: ${this.provider}. Must be 'sendgrid' or 'kirim'`);
    }

    // Configure email settings from environment variables
    this.fromEmail = process.env.EMAIL_FROM || 'no-reply@sodtix.com';
    this.emailDomain = process.env.EMAIL_DOMAIN || 'sodtix.com';

    if (this.provider === 'kirim') {
      // Configure Kirim.email
      const apiKey = process.env.KIRIM_EMAIL_API_KEY;
      const secret = process.env.KIRIM_EMAIL_SECRET;
      
      if (!apiKey || !secret) {
        console.error('KIRIM_EMAIL_API_KEY and KIRIM_EMAIL_SECRET environment variables are required');
        throw new Error('Kirim.email credentials are required');
      }
      
      this.apiKey = apiKey;
      this.secret = secret;
      console.log('📧 Email service initialized with Kirim.email');
    } else if (this.provider === 'sendgrid') {
      // Configure SendGrid
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        console.error('SENDGRID_API_KEY environment variable is required');
        throw new Error('SendGrid API key is required');
      }
      
      this.apiKey = apiKey;
      console.log('📧 Email service initialized with SendGrid');
    }
    
    console.log(`📧 From email: ${this.fromEmail}`);
    console.log(`📧 Email domain: ${this.emailDomain}`);
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
              <h3 style="color: #374151; margin-bottom: 10px;">${formTitle}</h3>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block;">
                <img src="${absoluteQrCodeUrl}" alt="Submission QR Code" style="display: block; margin: 0 auto; max-width: 200px; height: auto;" />
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Scan this QR code to access your submission</p>
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
            ${bannerImage}
            
            <div style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: #10b981; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <svg width="30" height="30" fill="white" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <h1 style="color: #111827; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">Submission Confirmed!</h1>
                <p style="color: #6b7280; margin: 0; font-size: 16px;">Thank you for submitting the form</p>
              </div>

              ${qrCodeImage}

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">This is an automated confirmation email. Please keep this for your records.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email using the configured provider
      let response;
      
      if (this.provider === 'kirim') {
        // Send via Kirim.email API
        const requestData = new URLSearchParams({
          from: this.fromEmail,
          to: recipientEmail,
          subject: `Form Submission Confirmation - ${formTitle}`,
          text: htmlContent
        });
        
        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'domain': this.emailDomain
        };

        const config = {
          method: 'post',
          url: 'https://smtp-app.kirim.email/api/v4/transactional/message',
          headers: headers,
          auth: {
            username: this.apiKey,
            password: this.secret
          },
          data: requestData
        };

        response = await axios(config);
        
        console.log('📧 Email sent successfully via Kirim.email:', {
          status: response.status,
          recipient: recipientEmail,
          data: response.data
        });
      } else if (this.provider === 'sendgrid') {
        // Send via SendGrid API
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(this.apiKey);
        
        const message = {
          to: recipientEmail,
          from: {
            email: this.fromEmail,
            name: 'OnTheForm'
          },
          subject: `Form Submission Confirmation - ${formTitle}`,
          html: htmlContent
        };

        response = await sgMail.send(message);
        
        console.log('📧 Email sent successfully via SendGrid:', {
          status: response[0].statusCode,
          recipient: recipientEmail,
          messageId: response[0].headers['x-message-id']
        });
      }

      // QR code files are now permanent public files, no cleanup needed

      return {
        success: true,
        messageId: response.data.id || 'unknown',
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending submission confirmation email:', {
        error: error.message,
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

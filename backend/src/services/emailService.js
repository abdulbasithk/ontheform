const axios = require('axios');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

// Email service configuration
class EmailService {
  constructor() {
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
      let qrCodeBuffer = null;

      // Generate QR code if requested
      if (showQrCode) {
        try {
          console.log('Generating QR code for submission:', submissionId);
          
          // Generate QR code as buffer for attachment
          qrCodeBuffer = await this.generateQRCodeBuffer(submissionId);
          console.log('QR code buffer generated successfully, size:', qrCodeBuffer ? qrCodeBuffer.length : 'null');
          
          if (qrCodeBuffer) {
            // Reference the attached QR code in email content
            qrCodeImage = `
              <div style="text-align: center; margin: 20px 0;">
                <h3 style="color: #374151; margin-bottom: 10px;">Your Submission QR Code</h3>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Your QR code is attached to this email. Scan it to access your submission: <strong>${submissionId}</strong></p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; font-size: 14px; margin: 0;">📎 QR Code attached as: <strong>submission-qr-${submissionId}.png</strong></p>
                </div>
              </div>
            `;
          } else {
            console.error('Failed to generate QR code buffer');
            qrCodeImage = `
              <div style="text-align: center; margin: 20px 0;">
                <p style="color: #ef4444; font-size: 14px;">QR code could not be generated for submission: <strong>${submissionId}</strong></p>
              </div>
            `;
          }
        } catch (error) {
          console.error('Error generating QR code for email:', error);
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

              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">${formTitle}</h2>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #6b7280; font-size: 14px;">Submission ID:</span>
                  <span style="color: #111827; font-weight: 600; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${submissionId}</span>
                </div>
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

      // Send email using Kirim.email API
      let requestData;
      let headers;
      
      if (qrCodeBuffer) {
        // Use FormData for emails with QR code attachment
        const formData = new FormData();
        
        formData.append('from', 'no-reply-form@sodtix.com');
        formData.append('to', recipientEmail);
        formData.append('subject', `Form Submission Confirmation - ${formTitle}`);
        formData.append('text', htmlContent);
        formData.append('attachment', qrCodeBuffer, {
          filename: `submission-qr-${submissionId}.png`,
          contentType: 'image/png'
        });
        
        requestData = formData;
        headers = {
          ...formData.getHeaders(),
          'domain': 'sodtix.com'
        };
      } else {
        // Use URLSearchParams for simple emails without attachments
        requestData = new URLSearchParams({
          from: 'no-reply-form@sodtix.com',
          to: recipientEmail,
          subject: `Form Submission Confirmation - ${formTitle}`,
          html: htmlContent
        });
        
        headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'domain': 'sodtix.com'
        };
      }

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

      const response = await axios(config);
      
      console.log('📧 Email sent successfully via Kirim.email:', {
        status: response.status,
        recipient: recipientEmail,
        data: response.data
      });

      return {
        success: true,
        messageId: response.data.id || 'unknown',
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
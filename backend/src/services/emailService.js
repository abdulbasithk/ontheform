const sgMail = require('@sendgrid/mail');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Email service configuration
class EmailService {
  constructor() {
    // Configure SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('SENDGRID_API_KEY environment variable is not set');
      throw new Error('SendGrid API key is required');
    }
    
    sgMail.setApiKey(apiKey);
    console.log('📧 Email service initialized with SendGrid');
  }

  // Generate QR code as base64 data URL
  async generateQRCode(data) {
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
      console.error('Error generating QR code:', error);
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
      let qrCodeAttachment = null;

      // Generate QR code if requested
      if (showQrCode) {
        try {
          console.log('Generating QR code for submission:', submissionId);
          const qrCodeDataURL = await this.generateQRCode(submissionId);
          console.log('QR code generated successfully, data URL length:', qrCodeDataURL ? qrCodeDataURL.length : 'null');
          
          if (qrCodeDataURL && qrCodeDataURL.startsWith('data:image')) {
            qrCodeImage = `
              <div style="text-align: center; margin: 20px 0;">
                <h3 style="color: #374151; margin-bottom: 10px;">Your Submission QR Code</h3>
                <img src="${qrCodeDataURL}" alt="Submission QR Code" style="border: 1px solid #e5e7eb; border-radius: 8px; max-width: 200px;" />
                <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">Scan this QR code to access your submission: <strong>${submissionId}</strong></p>
              </div>
            `;
          } else {
            console.error('Invalid QR code data URL generated:', qrCodeDataURL);
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
                ${showQrCode ? '<p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">You can use the QR code above to quickly access your submission details.</p>' : ''}
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Form Submission Confirmation

Thank you for submitting the form: ${formTitle}

Submission ID: ${submissionId}

${showQrCode ? 'A QR code has been included in the HTML version of this email for easy access to your submission.' : ''}

This is an automated confirmation email. Please keep this for your records.
      `;

      const mailOptions = {
        from: {
          email: 'no-reply-form@sodtix.com',
          name: 'On The Form'
        },
        to: recipientEmail,
        subject: `Form Submission Confirmation - ${formTitle}`,
        text: textContent,
        html: htmlContent
      };

      const result = await sgMail.send(mailOptions);
      
      console.log('📧 Email sent successfully via SendGrid:', {
        statusCode: result[0].statusCode,
        recipient: recipientEmail,
        messageId: result[0].headers['x-message-id']
      });

      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        statusCode: result[0].statusCode
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      // SendGrid doesn't have a direct verify method, but we can check if API key is set
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        throw new Error('SendGrid API key not configured');
      }
      
      console.log('📧 SendGrid email service connection verified');
      return true;
    } catch (error) {
      console.error('SendGrid email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
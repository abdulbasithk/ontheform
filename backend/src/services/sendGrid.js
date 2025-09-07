const sgMail = require('@sendgrid/mail');
const fs = require('fs');

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmailSendGrid = async (email, subject, html, buffer) => {
  try {
    const pdfBase64 = buffer ? buffer : null;
    
    // Define the email message
    const message = {
      to: email,
      from: {
        email: 'no-reply@sodtix.com',
        name: 'SODTix',
      },
      subject: subject,
      html: html,
    };

    // Attach PDF if buffer is available
    if (pdfBase64) {
      message.attachments = [
        {
          content: pdfBase64,
          filename: 'Invoice.pdf',
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];
    }

    // Send email via SendGrid
    const response = await sgMail.send(message);

    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

module.exports = sendEmailSendGrid;

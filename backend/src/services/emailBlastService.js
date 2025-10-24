const emailService = require("./emailService");
const queueService = require("./queueService");
const { v4: uuidv4 } = require("uuid");

class EmailBlastService {
  constructor() {
    this.activeBlasts = new Map(); // Track active blasts
  }

  // Replace placeholders in email content with actual data
  replacePlaceholders(content, data) {
    let processedContent = content;

    // Replace all {{placeholder}} with actual values
    // Updated regex to support UUIDs (includes hyphens)
    const placeholderRegex = /\{\{([a-zA-Z0-9_-]+)\}\}/g;
    processedContent = processedContent.replace(
      placeholderRegex,
      (match, key) => {
        // Check if the key exists in the data
        if (data.hasOwnProperty(key)) {
          return data[key] || "";
        }
        // If not found, leave the placeholder as is
        return match;
      }
    );

    return processedContent;
  }

  // Extract available placeholders from form fields
  getAvailablePlaceholders(formFields) {
    const placeholders = [
      {
        key: "email",
        label: "Email Address",
        description: "Recipient email address",
      },
    ];

    // Add form fields as placeholders
    formFields.forEach((field) => {
      placeholders.push({
        key: field.id,
        label: field.label,
        description: `Form field: ${field.label}`,
      });
    });

    return placeholders;
  }

  // Get recipients with valid emails from form submissions
  async getRecipients(submissions, formFields) {
    const recipients = [];

    for (const submission of submissions) {
      const email = submission.submitter_email;

      if (!email || !this.isValidEmail(email)) {
        continue;
      }

      // Build data object for placeholder replacement
      const data = {
        email: email,
        submissionId: submission.id,
        submittedAt: submission.submitted_at,
      };

      // Add form field responses
      if (submission.responses) {
        Object.keys(submission.responses).forEach((fieldId) => {
          data[fieldId] = submission.responses[fieldId];
        });
      }

      recipients.push({
        email: email,
        data: data,
      });
    }

    return recipients;
  }

  // Validate email address
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Send test email
  async sendTestEmail({
    recipientEmail,
    subject,
    htmlContent,
    formTitle,
    bannerUrl,
    testData,
  }) {
    try {
      // Validate email
      if (!this.isValidEmail(recipientEmail)) {
        throw new Error("Invalid email address");
      }

      // Replace placeholders with test data
      const processedSubject = this.replacePlaceholders(subject, testData);
      const processedContent = this.replacePlaceholders(htmlContent, testData);

      // Build email HTML with banner if available
      const emailHtml = this.buildEmailHtml(
        processedContent,
        formTitle,
        bannerUrl
      );

      // Send email using existing email service
      const result = await this.sendEmail(
        recipientEmail,
        processedSubject,
        emailHtml
      );

      return {
        success: true,
        message: "Test email sent successfully",
        result: result,
      };
    } catch (error) {
      console.error("Error sending test email:", error);
      throw error;
    }
  }

  // Start email blast
  async startEmailBlast({
    formId,
    formTitle,
    subject,
    htmlContent,
    recipients,
    bannerUrl,
    userId,
  }) {
    try {
      // Initialize queue service
      await queueService.initialize();

      // Generate unique blast ID
      const blastId = uuidv4();

      // Store blast metadata
      this.activeBlasts.set(blastId, {
        formId,
        formTitle,
        subject,
        totalRecipients: recipients.length,
        startedAt: new Date(),
        userId,
        status: "processing",
      });

      // Add jobs to queue for each recipient
      const jobPromises = recipients.map(async (recipient) => {
        const processedSubject = this.replacePlaceholders(
          subject,
          recipient.data
        );
        const processedContent = this.replacePlaceholders(
          htmlContent,
          recipient.data
        );
        const emailHtml = this.buildEmailHtml(
          processedContent,
          formTitle,
          bannerUrl
        );

        return queueService.addEmailBlastJob({
          blastId,
          formId,
          recipientEmail: recipient.email,
          subject: processedSubject,
          htmlContent: emailHtml,
          data: recipient.data,
        });
      });

      await Promise.all(jobPromises);

      console.log(
        `📧 Email blast ${blastId} started with ${recipients.length} recipients`
      );

      return {
        blastId,
        totalRecipients: recipients.length,
        status: "processing",
        message: "Email blast started successfully",
      };
    } catch (error) {
      console.error("Error starting email blast:", error);
      throw error;
    }
  }

  // Get blast status
  async getBlastStatus(blastId) {
    try {
      const summary = await queueService.getBlastSummary(blastId);
      const metadata = this.activeBlasts.get(blastId);

      return {
        blastId,
        ...summary,
        metadata: metadata || null,
      };
    } catch (error) {
      console.error("Error getting blast status:", error);
      throw error;
    }
  }

  // Build email HTML with banner and styling
  buildEmailHtml(content, formTitle, bannerUrl) {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const absoluteBannerUrl = `${baseUrl}${bannerUrl}`;
    const bannerImage = bannerUrl
      ? `<div style="width: 100%; max-height: 200px; overflow: hidden;">
           <img src="${absoluteBannerUrl}" alt="${formTitle}" style="width: 100%; height: auto; display: block;" />
         </div>`
      : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${formTitle}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
          ${bannerImage}
          <div style="padding: 12px;">
            ${content}
            <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">This email was sent from ${formTitle}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send individual email using configured provider
  async sendEmail(recipientEmail, subject, htmlContent) {
    try {
      const axios = require("axios");

      if (emailService.provider === 'kirim') {
        // Send via Kirim.email
        const requestData = new URLSearchParams({
          from: emailService.fromEmail,
          to: recipientEmail,
          subject: subject,
          text: htmlContent,
        });

        const headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          domain: emailService.emailDomain,
        };

        const config = {
          method: "post",
          url: "https://smtp-app.kirim.email/api/v4/transactional/message",
          headers: headers,
          auth: {
            username: emailService.apiKey,
            password: emailService.secret,
          },
          data: requestData,
        };

        const response = await axios(config);

        return {
          success: true,
          messageId: response.data.id || "unknown",
          status: response.status,
        };
      } else if (emailService.provider === 'sendgrid') {
        // Send via SendGrid
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(emailService.apiKey);

        const message = {
          to: recipientEmail,
          from: {
            email: emailService.fromEmail,
            name: 'OnTheForm'
          },
          subject: subject,
          html: htmlContent
        };

        const response = await sgMail.send(message);

        return {
          success: true,
          messageId: response[0].headers['x-message-id'] || 'unknown',
          status: response[0].statusCode,
        };
      }
    } catch (error) {
      console.error("Error sending email:", error.message);
      throw error;
    }
  }

  // Clean up old blast metadata
  cleanupOldBlasts(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [blastId, metadata] of this.activeBlasts.entries()) {
      if (now - metadata.startedAt.getTime() > maxAge) {
        this.activeBlasts.delete(blastId);
      }
    }
  }
}

// Export singleton instance
const emailBlastService = new EmailBlastService();
module.exports = emailBlastService;

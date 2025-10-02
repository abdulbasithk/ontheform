const queueService = require('../services/queueService');
const emailBlastService = require('../services/emailBlastService');

// Process email blast jobs
async function processEmailBlastJob(job) {
  const { recipientEmail, subject, htmlContent, blastId, formId } = job.data;

  try {
    console.log(`📧 Processing email for ${recipientEmail} (Blast: ${blastId})`);

    // Update progress
    job.progress(10);

    // Send email
    const result = await emailBlastService.sendEmail(recipientEmail, subject, htmlContent);

    // Update progress
    job.progress(100);

    console.log(`✅ Email sent successfully to ${recipientEmail}`);

    return {
      success: true,
      recipientEmail,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${recipientEmail}:`, error.message);
    throw error;
  }
}

// Initialize worker
async function initializeWorker() {
  try {
    // Initialize queue service
    await queueService.initialize();

    // Process jobs
    queueService.emailBlastQueue.process('send-email', async (job) => {
      return await processEmailBlastJob(job);
    });

    console.log('📧 Email blast worker initialized and ready to process jobs');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📧 SIGTERM received, closing worker gracefully...');
      await queueService.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('📧 SIGINT received, closing worker gracefully...');
      await queueService.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to initialize email blast worker:', error);
    process.exit(1);
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  initializeWorker();
}

module.exports = { initializeWorker, processEmailBlastJob };


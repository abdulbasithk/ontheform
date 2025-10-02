const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, handleValidationErrors } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../config/database');
const emailBlastService = require('../services/emailBlastService');

// Validation middleware
const validateUUID = [
  param('id').isUUID().withMessage('Invalid form ID format')
];

const validateTestEmail = [
  body('recipientEmail').isEmail().withMessage('Valid email address is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('htmlContent').notEmpty().withMessage('Email content is required'),
  body('testData').optional().isObject().withMessage('Test data must be an object')
];

const validateEmailBlast = [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('htmlContent').notEmpty().withMessage('Email content is required')
];

// Helper function to check form ownership
async function checkFormOwnership(formId, userId, userRole) {
  const result = await dbQuery(
    'SELECT id, title, created_by, banner_url FROM forms WHERE id = $1',
    [formId]
  );

  if (result.rows.length === 0) {
    throw new Error('Form not found');
  }

  const form = result.rows[0];

  // Super admins can access all forms
  if (userRole !== 'super_admin' && form.created_by !== userId) {
    throw new Error('Access denied');
  }

  return form;
}

// GET /api/forms/:id/email-blast/recipients - Get list of recipients with valid emails
router.get('/:id/recipients', 
  authenticateToken, 
  validateUUID, 
  handleValidationErrors, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check form ownership
    const form = await checkFormOwnership(id, req.user.id, req.user.role);

    // Get all submissions for this form
    const submissionsResult = await dbQuery(
      `SELECT id, form_id, responses, submitter_email, submitted_at
       FROM form_submissions
       WHERE form_id = $1
       ORDER BY submitted_at DESC`,
      [id]
    );

    // Get form fields for placeholder information
    const formResult = await dbQuery(
      'SELECT fields FROM forms WHERE id = $1',
      [id]
    );

    const formFields = formResult.rows[0]?.fields || [];

    // Get recipients with valid emails
    const recipients = await emailBlastService.getRecipients(
      submissionsResult.rows,
      formFields
    );

    // Get available placeholders
    const placeholders = emailBlastService.getAvailablePlaceholders(formFields);

    res.json({
      formId: id,
      formTitle: form.title,
      totalSubmissions: submissionsResult.rows.length,
      validRecipients: recipients.length,
      recipients: recipients.map(r => ({
        email: r.email,
        data: r.data
      })),
      placeholders: placeholders
    });
  })
);

// POST /api/forms/:id/email-blast/test - Send test email
router.post('/:id/test',
  authenticateToken,
  validateUUID,
  validateTestEmail,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { recipientEmail, subject, htmlContent, testData } = req.body;

    // Check form ownership
    const form = await checkFormOwnership(id, req.user.id, req.user.role);

    // Send test email
    const result = await emailBlastService.sendTestEmail({
      recipientEmail,
      subject,
      htmlContent,
      formTitle: form.title,
      bannerUrl: form.banner_url,
      testData: testData || {}
    });

    res.json({
      message: 'Test email sent successfully',
      result: result
    });
  })
);

// POST /api/forms/:id/email-blast/send - Start email blast
router.post('/:id/send',
  authenticateToken,
  validateUUID,
  validateEmailBlast,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subject, htmlContent } = req.body;

    // Check form ownership
    const form = await checkFormOwnership(id, req.user.id, req.user.role);

    // Get all submissions for this form
    const submissionsResult = await dbQuery(
      `SELECT id, form_id, responses, submitter_email, submitted_at
       FROM form_submissions
       WHERE form_id = $1
       ORDER BY submitted_at DESC`,
      [id]
    );

    if (submissionsResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No submissions found for this form',
        code: 'NO_SUBMISSIONS'
      });
    }

    // Get form fields
    const formResult = await dbQuery(
      'SELECT fields FROM forms WHERE id = $1',
      [id]
    );

    const formFields = formResult.rows[0]?.fields || [];

    // Get recipients with valid emails
    const recipients = await emailBlastService.getRecipients(
      submissionsResult.rows,
      formFields
    );

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No valid email addresses found in submissions',
        code: 'NO_VALID_EMAILS'
      });
    }

    // Start email blast
    const result = await emailBlastService.startEmailBlast({
      formId: id,
      formTitle: form.title,
      subject,
      htmlContent,
      recipients,
      bannerUrl: form.banner_url,
      userId: req.user.id
    });

    res.json({
      message: 'Email blast started successfully',
      blastId: result.blastId,
      totalRecipients: result.totalRecipients,
      status: result.status
    });
  })
);

// GET /api/forms/:id/email-blast/status/:blastId - Get blast status
router.get('/:id/status/:blastId',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Invalid form ID format'),
    param('blastId').isUUID().withMessage('Invalid blast ID format')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id, blastId } = req.params;

    // Check form ownership
    await checkFormOwnership(id, req.user.id, req.user.role);

    // Get blast status
    const status = await emailBlastService.getBlastStatus(blastId);

    res.json(status);
  })
);

// GET /api/forms/:id/email-blast/placeholders - Get available placeholders
router.get('/:id/placeholders',
  authenticateToken,
  validateUUID,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check form ownership
    await checkFormOwnership(id, req.user.id, req.user.role);

    // Get form fields
    const formResult = await dbQuery(
      'SELECT fields FROM forms WHERE id = $1',
      [id]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Form not found',
        code: 'FORM_NOT_FOUND'
      });
    }

    const formFields = formResult.rows[0].fields || [];
    const placeholders = emailBlastService.getAvailablePlaceholders(formFields);

    res.json({
      placeholders: placeholders
    });
  })
);

module.exports = router;


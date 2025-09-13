const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const QRCode = require('qrcode');
const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

const router = express.Router();

// Validation middleware
const validateSubmission = [
  body('formId')
    .isUUID()
    .withMessage('Valid form ID is required'),
  body('responses')
    .isObject()
    .withMessage('Responses must be an object')
];

const validateUUID = [
  param('formId')
    .isUUID()
    .withMessage('Invalid ID format')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Helper function to validate form responses
const validateFormResponses = async (formId, responses) => {
  // Get form fields
  const formResult = await query(
    'SELECT fields FROM forms WHERE id = $1 AND is_active = true',
    [formId]
  );

  if (formResult.rows.length === 0) {
    throw new AppError('Form not found or inactive', 404, 'FORM_NOT_FOUND');
  }

  const fields = formResult.rows[0].fields;
  const errors = [];

  // Validate each required field
  for (const field of fields) {
    if (field.required) {
      const value = responses[field.id];
      
      if (value === undefined || value === null || value === '') {
        errors.push(`${field.label} is required`);
      } else if (Array.isArray(value) && value.length === 0) {
        errors.push(`${field.label} is required`);
      }
    }

    // Validate email fields
    if (field.type === 'email' && responses[field.id]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(responses[field.id])) {
        errors.push(`${field.label} must be a valid email address`);
      }
    }

    // Validate select/radio options
    if ((field.type === 'select' || field.type === 'radio') && responses[field.id]) {
      if (field.options && !field.options.includes(responses[field.id])) {
        // If allow_other is true, accept any value not in predefined options
        if (!field.allow_other) {
          errors.push(`${field.label} contains an invalid option`);
        }
      }
    }

    // Validate checkbox options
    if (field.type === 'checkbox' && responses[field.id]) {
      const values = Array.isArray(responses[field.id]) ? responses[field.id] : [responses[field.id]];
      if (field.options) {
        for (const value of values) {
          if (!field.options.includes(value)) {
            errors.push(`${field.label} contains an invalid option: ${value}`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new AppError('Form validation failed', 400, 'FORM_VALIDATION_ERROR', errors);
  }

  return true;
};

// POST /api/submissions - Submit form (public endpoint)
router.post('/', validateSubmission, handleValidationErrors, asyncHandler(async (req, res) => {
  const { formId, responses } = req.body;
  const submitterIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    // Get form and validate it exists and is active
    const formResult = await query(
      'SELECT id, title, fields, unique_constraint_type, unique_constraint_field, show_qr_code, send_email_notification, banner_url FROM forms WHERE id = $1 AND is_active = true',
      [formId]
    );

    if (formResult.rows.length === 0) {
      throw new AppError('Form not found or inactive', 404, 'FORM_NOT_FOUND');
    }

    const form = formResult.rows[0];

    // Check unique constraints
    if (form.unique_constraint_type && form.unique_constraint_type !== 'none') {
      let constraintQuery = '';
      let constraintParams = [formId];
      let constraintMessage = '';

      switch (form.unique_constraint_type) {
        case 'ip':
          constraintQuery = 'SELECT id FROM form_submissions WHERE form_id = $1 AND submitter_ip = $2';
          constraintParams.push(submitterIp); 
          constraintMessage = 'You have already submitted this form from this IP address';
          break;

        case 'field':
          if (!form.unique_constraint_field || !responses[form.unique_constraint_field]) {
            throw new AppError('Required unique field is missing', 400, 'UNIQUE_FIELD_REQUIRED');
          }
          constraintQuery = `SELECT id FROM form_submissions WHERE form_id = $1 AND responses->>'${form.unique_constraint_field}' = $2`;
          constraintParams.push(responses[form.unique_constraint_field]);
          constraintMessage = 'A submission with this value already exists';
          break;
      }

      if (constraintQuery) {
        const existingSubmission = await query(constraintQuery, constraintParams);
        if (existingSubmission.rows.length > 0) {
          throw new AppError(constraintMessage, 409, 'DUPLICATE_SUBMISSION');
        }
      }
    }

    // Validate form responses
    await validateFormResponses(formId, responses);

    // Extract and validate email from form fields
     let submitterEmail = null;
     for (const field of form.fields) {
       if (field.type === 'email' && responses[field.id]) {
         const emailValue = responses[field.id].trim();
         // Basic email validation
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (emailRegex.test(emailValue)) {
           submitterEmail = emailValue.toLowerCase();
           break; // Use the first valid email field found
         } else {
           throw new AppError(`Invalid email format in field: ${field.label}`, 400, 'INVALID_EMAIL_FORMAT');
         }
       }
     }

    // Create submission
    const submissionId = uuidv4();
    const result = await query(
      `INSERT INTO form_submissions (id, form_id, responses, submitter_email, submitter_ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, form_id, responses, submitter_email, submitted_at`,
      [submissionId, formId, JSON.stringify(responses), submitterEmail, submitterIp, userAgent]
    );

    const submission = result.rows[0];

    // Update form submission count
    await query(
      'UPDATE forms SET submission_count = submission_count + 1 WHERE id = $1',
      [formId]
    );

    // Prepare response data
    const responseData = {
      message: 'Form submitted successfully',
      submission: {
        id: submission.id,
        formId: submission.form_id,
        submittedAt: submission.submitted_at
      }
    };

    // Generate QR code if enabled
    if (form.show_qr_code) {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(submissionId, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        responseData.qrCode = qrCodeDataURL;
      } catch (error) {
        console.error('Error generating QR code:', error);
        // Don't fail the submission if QR code generation fails
      }
    }

    // Send email notification if enabled
    if (form.send_email_notification && submitterEmail) {
      try {
        await emailService.sendSubmissionConfirmation({
          recipientEmail: submitterEmail,
          formTitle: form.title,
          submissionId: submissionId,
          showQrCode: form.show_qr_code,
          bannerUrl: form.banner_url
        });
        responseData.emailSent = true;
      } catch (error) {
        console.error('Error sending email notification:', error);
        // Don't fail the submission if email sending fails
        responseData.emailSent = false;
        responseData.emailError = 'Failed to send confirmation email';
      }
    }

    res.status(201).json(responseData);
  } catch (error) {
    if (error.code === 'FORM_VALIDATION_ERROR') {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        validationErrors: error.details
      });
    }
    if (error.code === 'DUPLICATE_SUBMISSION') {
      return res.status(409).json({
        error: error.message,
        code: error.code
      });
    }
    if (error.code === 'EMAIL_REQUIRED' || error.code === 'UNIQUE_FIELD_REQUIRED' || error.code === 'INVALID_EMAIL_FORMAT') {
       return res.status(400).json({
         error: error.message,
         code: error.code
       });
     }
    throw error;
  }
}));

// GET /api/submissions - Get all submissions for authenticated user's forms
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, formId, search, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  // Super admin can see all submissions, regular admin only sees their own forms' submissions
  let whereClause = '';
  let queryParams = [];
  let paramCount = 1;

  if (req.user.role !== 'super_admin') {
    whereClause = `WHERE f.created_by = $1`;
    queryParams = [req.user.id];
    paramCount = 2;
  } else {
    whereClause = 'WHERE 1=1';
  }

  // Filter by specific form
  if (formId) {
    whereClause += ` AND fs.form_id = $${paramCount}`;
    queryParams.push(formId);
    paramCount++;
  }

  // Search in responses or email
  if (search) {
    whereClause += ` AND (fs.responses::text ILIKE $${paramCount} OR fs.submitter_email ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  // Date range filter
  if (startDate) {
    whereClause += ` AND fs.submitted_at >= $${paramCount}`;
    queryParams.push(startDate);
    paramCount++;
  }

  if (endDate) {
    whereClause += ` AND fs.submitted_at <= $${paramCount}`;
    queryParams.push(endDate);
    paramCount++;
  }

  // Get submissions with form info
  const submissionsResult = await query(
    `SELECT 
      fs.id, fs.form_id, fs.responses, fs.submitter_email, fs.submitted_at,
      f.title as form_title
    FROM form_submissions fs
    JOIN forms f ON fs.form_id = f.id
    ${whereClause}
    ORDER BY fs.submitted_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...queryParams, parseInt(limit), offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total 
     FROM form_submissions fs
     JOIN forms f ON fs.form_id = f.id
     ${whereClause}`,
    queryParams
  );

  const totalSubmissions = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalSubmissions / limit);

  res.json({
    submissions: submissionsResult.rows.map(sub => ({
      id: sub.id,
      formId: sub.form_id,
      formTitle: sub.form_title,
      responses: sub.responses,
      submitterEmail: sub.submitter_email,
      submittedAt: sub.submitted_at
    })),
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalSubmissions,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
}));

// GET /api/submissions/form/:formId - Get submissions for specific form
router.get('/form/:formId', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const { page = 1, limit = 10, search, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  // Check if user owns the form or is super admin
  const formResult = await query(
    'SELECT id, title, created_by FROM forms WHERE id = $1',
    [formId]
  );

  if (formResult.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found',
      code: 'FORM_NOT_FOUND'
    });
  }

  // Super admins can access all forms, regular admins only their own
  if (req.user.role !== 'super_admin' && formResult.rows[0].created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only view submissions for your own forms',
      code: 'FORM_ACCESS_DENIED'
    });
  }

  let whereClause = 'WHERE form_id = $1';
  let queryParams = [formId];
  let paramCount = 2;

  // Search filter
  if (search) {
    whereClause += ` AND (responses::text ILIKE $${paramCount} OR submitter_email ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  // Date range filter
  if (startDate) {
    whereClause += ` AND submitted_at >= $${paramCount}`;
    queryParams.push(startDate);
    paramCount++;
  }

  if (endDate) {
    whereClause += ` AND submitted_at <= $${paramCount}`;
    queryParams.push(endDate);
    paramCount++;
  }

  // Get submissions
  const submissionsResult = await query(
    `SELECT id, form_id, responses, submitter_email, submitted_at
     FROM form_submissions
     ${whereClause}
     ORDER BY submitted_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...queryParams, parseInt(limit), offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM form_submissions ${whereClause}`,
    queryParams
  );

  const totalSubmissions = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalSubmissions / limit);

  res.json({
    form: {
      id: formResult.rows[0].id,
      title: formResult.rows[0].title
    },
    submissions: submissionsResult.rows.map(sub => ({
      id: sub.id,
      formId: sub.form_id,
      responses: sub.responses,
      submitterEmail: sub.submitter_email,
      submittedAt: sub.submitted_at
    })),
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalSubmissions,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
}));

// GET /api/submissions/:id - Get single submission
router.get('/:id', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      fs.id, fs.form_id, fs.responses, fs.submitter_email, fs.submitter_ip, 
      fs.user_agent, fs.submitted_at,
      f.title as form_title, f.created_by
    FROM form_submissions fs
    JOIN forms f ON fs.form_id = f.id
    WHERE fs.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: 'Submission not found',
      code: 'SUBMISSION_NOT_FOUND'
    });
  }

  const submission = result.rows[0];

  // Super admins can access all submissions, regular admins only their own forms
  if (req.user.role !== 'super_admin' && submission.created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only view submissions for your own forms',
      code: 'SUBMISSION_ACCESS_DENIED'
    });
  }

  res.json({
    submission: {
      id: submission.id,
      formId: submission.form_id,
      formTitle: submission.form_title,
      responses: submission.responses,
      submitterEmail: submission.submitter_email,
      submitterIp: submission.submitter_ip,
      userAgent: submission.user_agent,
      submittedAt: submission.submitted_at
    }
  });
}));

// DELETE /api/submissions/:id - Delete submission
router.delete('/:id', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if submission exists and user owns the form
  const submissionResult = await query(
    `SELECT fs.id, f.created_by, f.title
     FROM form_submissions fs
     JOIN forms f ON fs.form_id = f.id
     WHERE fs.id = $1`,
    [id]
  );

  if (submissionResult.rows.length === 0) {
    return res.status(404).json({
      error: 'Submission not found',
      code: 'SUBMISSION_NOT_FOUND'
    });
  }

  const submission = submissionResult.rows[0];

  // Super admins can delete all submissions, regular admins only their own forms
  if (req.user.role !== 'super_admin' && submission.created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only delete submissions for your own forms',
      code: 'SUBMISSION_ACCESS_DENIED'
    });
  }

  // Delete submission
  await query('DELETE FROM form_submissions WHERE id = $1', [id]);

  res.json({
    message: 'Submission deleted successfully',
    deletedSubmission: {
      id: submission.id,
      formTitle: submission.title
    }
  });
}));

// GET /api/submissions/export/form/:formId - Export submissions as Excel
router.get('/export/form/:formId', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const userId = req.user.id;

  // Verify form ownership or super admin access
  const formResult = await query(
    'SELECT id, title, created_by, fields FROM forms WHERE id = $1',
    [formId]
  );

  if (formResult.rows.length === 0) {
    throw new AppError('Form not found', 404, 'FORM_NOT_FOUND');
  }

  const form = formResult.rows[0];
  // Super admins can export all forms, regular admins only their own
  if (req.user.role !== 'super_admin' && form.created_by !== userId) {
    throw new AppError('You can only export submissions for your own forms', 403, 'FORM_ACCESS_DENIED');
  }

  // Get all submissions for the form
  const result = await query(
    `SELECT 
       fs.id,
       fs.submitted_at,
       fs.submitter_email,
       fs.responses
     FROM form_submissions fs
     WHERE fs.form_id = $1
     ORDER BY fs.submitted_at DESC`,
    [formId]
  );

  const submissions = result.rows;
  const formFields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Form Submissions');

  // Set up headers
  const headers = [
    { header: 'Submission ID', key: 'id', width: 40 },
    { header: 'Submitted At', key: 'submitted_at', width: 20 },
    { header: 'Submitter Email', key: 'submitter_email', width: 30 }
  ];

  // Add form field headers
  formFields.forEach(field => {
    headers.push({
      header: field.label,
      key: field.id,
      width: 20
    });
  });

  worksheet.columns = headers;

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F3FF' }
  };

  // Add data rows
  submissions.forEach(submission => {
    const responses = typeof submission.responses === 'string' 
      ? JSON.parse(submission.responses) 
      : submission.responses;
    
    const rowData = {
      id: submission.id,
      submitted_at: submission.submitted_at.toISOString().replace('T', ' ').substring(0, 19),
      submitter_email: submission.submitter_email || 'Anonymous'
    };

    // Add form field responses
    formFields.forEach(field => {
      const value = responses?.[field.id];
      if (Array.isArray(value)) {
        rowData[field.id] = value.join(', ');
      } else {
        rowData[field.id] = value || '';
      }
    });

    worksheet.addRow(rowData);
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    if (column.width < 10) column.width = 10;
    if (column.width > 50) column.width = 50;
  });

  // Set response headers for Excel download
  const filename = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}_submissions_${new Date().toISOString().split('T')[0]}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  
  // Write to response
  await workbook.xlsx.write(res);
  res.end();
}));

// PUT /api/submissions/:id - Update submission responses (admin only)
router.put('/:id', authenticateToken, [
  param('id')
    .isUUID()
    .withMessage('Invalid submission ID format'),
  body('responses')
    .isObject()
    .withMessage('Responses must be an object')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { responses } = req.body;

  // Get submission with form info to check ownership
  const submissionResult = await query(
    `SELECT fs.*, f.created_by, f.fields, f.title 
     FROM form_submissions fs 
     JOIN forms f ON fs.form_id = f.id 
     WHERE fs.id = $1`,
    [id]
  );

  if (submissionResult.rows.length === 0) {
    throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
  }

  const submission = submissionResult.rows[0];

  // Check ownership (super admin can update any submission)
  if (req.user.role !== 'super_admin' && submission.created_by !== req.user.id) {
    throw new AppError('You can only update submissions for your own forms', 403, 'SUBMISSION_ACCESS_DENIED');
  }

  // Validate responses against form fields
  await validateFormResponses(submission.form_id, responses);

  // Update submission
  const result = await query(
    `UPDATE form_submissions 
     SET responses = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2 
     RETURNING id, form_id, responses, submitter_email, submitted_at`,
    [JSON.stringify(responses), id]
  );

  res.json({
    message: 'Submission updated successfully',
    submission: result.rows[0]
  });
}));

// DELETE /api/submissions/:id - Delete submission (admin only)
router.delete('/submission/:id', authenticateToken, [
  param('id')
    .isUUID()
    .withMessage('Invalid submission ID format')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get submission with form info to check ownership
  const submissionResult = await query(
    `SELECT fs.*, f.created_by, f.title 
     FROM form_submissions fs 
     JOIN forms f ON fs.form_id = f.id 
     WHERE fs.id = $1`,
    [id]
  );

  if (submissionResult.rows.length === 0) {
    throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
  }

  const submission = submissionResult.rows[0];

  // Check ownership (super admin can delete any submission)
  if (req.user.role !== 'super_admin' && submission.created_by !== req.user.id) {
    throw new AppError('You can only delete submissions for your own forms', 403, 'SUBMISSION_ACCESS_DENIED');
  }

  // Delete submission
  await query('DELETE FROM form_submissions WHERE id = $1', [id]);

  res.json({
    message: 'Submission deleted successfully',
    deletedSubmission: {
      id: submission.id,
      formTitle: submission.title,
      submitterEmail: submission.submitter_email
    }
  });
}));

module.exports = router;
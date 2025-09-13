const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Serve uploaded files
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Validation middleware
const validateForm = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('fields')
    .isArray({ min: 1 })
    .withMessage('At least one field is required'),
  body('fields.*.id')
    .trim()
    .notEmpty()
    .withMessage('Field ID is required'),
  body('fields.*.type')
    .isIn(['text', 'email', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date'])
    .withMessage('Invalid field type'),
  body('fields.*.label')
    .trim()
    .notEmpty()
    .withMessage('Field label is required'),
  body('fields.*.secondary_label')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Secondary label must be less than 255 characters'),
  body('fields.*.required')
    .isBoolean()
    .withMessage('Field required must be boolean'),
  body('fields.*.allow_other')
    .optional()
    .isBoolean()
    .withMessage('Allow other must be boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean')
];

const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid form ID format')
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

// Helper function to check form ownership
const checkFormOwnership = async (formId, userId, userRole) => {
  const result = await query(
    'SELECT id, created_by FROM forms WHERE id = $1',
    [formId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Form not found', 404, 'FORM_NOT_FOUND');
  }

  const form = result.rows[0];
  
  // Super admin can access any form
  if (userRole === 'super_admin') {
    return form;
  }

  // Regular admin can only access their own forms
  if (form.created_by !== userId) {
    throw new AppError('You can only access your own forms', 403, 'FORM_ACCESS_DENIED');
  }

  return form;
};

// GET /api/forms - Get all forms (admin only)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const offset = (page - 1) * limit;

  // Super admin can see all forms, regular admin only sees their own
  let whereClause = '';
  let queryParams = [];
  let paramCount = 1;

  if (req.user.role !== 'super_admin') {
    whereClause = 'WHERE created_by = $1';
    queryParams = [req.user.id];
    paramCount = 2;
  } else {
    whereClause = 'WHERE 1=1';
  }

  // Add search filter
  if (search) {
    whereClause += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  // Add status filter
  if (status === 'active') {
    whereClause += ` AND is_active = true`;
  } else if (status === 'inactive') {
    whereClause += ` AND is_active = false`;
  }

  // Get forms with pagination
  const formsResult = await query(
    `SELECT 
      id, title, description, fields, is_active, submission_count,
      unique_constraint_type, unique_constraint_field, banner_url,
      show_qr_code, send_email_notification,
      created_at, updated_at
    FROM forms 
    ${whereClause}
    ORDER BY updated_at DESC 
    LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...queryParams, parseInt(limit), offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM forms ${whereClause}`,
    queryParams
  );

  const totalForms = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalForms / limit);

  res.json({
    forms: formsResult.rows,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalForms,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
}));

// GET /api/forms/:id - Get single form (public for form display, auth for admin)
router.get('/:id', validateUUID, handleValidationErrors, optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  let selectClause = 'id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at';
  let whereClause = 'WHERE id = $1';
  let queryParams = [id];

  // If not authenticated, only return active forms
  if (!req.user) {
    whereClause += ' AND is_active = true';
  } else {
    // If authenticated, add creator info and allow inactive forms
    selectClause += ', created_by';
  }

  const result = await query(
    `SELECT ${selectClause} FROM forms ${whereClause}`,
    queryParams
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found or not accessible',
      code: 'FORM_NOT_FOUND'
    });
  }

  const form = result.rows[0];

  // If authenticated user, check if they own the form (for admin features)
  if (req.user && form.created_by && form.created_by !== req.user.id) {
    // Remove sensitive admin fields for non-owners
    delete form.created_by;
  }

  res.json({ form });
}));

// POST /api/forms - Create new form
router.post('/', authenticateToken, validateForm, handleValidationErrors, asyncHandler(async (req, res) => {
  const { title, description, fields, isActive = true } = req.body;
  const formId = uuidv4();

  // Validate field IDs are unique within the form
  const fieldIds = fields.map(field => field.id);
  const uniqueFieldIds = [...new Set(fieldIds)];
  if (fieldIds.length !== uniqueFieldIds.length) {
    return res.status(400).json({
      error: 'Field IDs must be unique within the form',
      code: 'DUPLICATE_FIELD_IDS'
    });
  }

  const result = await query(
    `INSERT INTO forms (id, title, description, fields, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at`,
    [formId, title, description, JSON.stringify(fields), isActive, req.user.id]
  );

  const newForm = result.rows[0];

  res.status(201).json({
    message: 'Form created successfully',
    form: newForm
  });
}));

// PUT /api/forms/:id - Update form
router.put('/:id', authenticateToken, validateUUID, validateForm, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, fields, isActive } = req.body;

  // Check if form exists and user owns it
  const existingForm = await query(
    'SELECT id, created_by FROM forms WHERE id = $1',
    [id]
  );

  if (existingForm.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found',
      code: 'FORM_NOT_FOUND'
    });
  }

  // Check ownership (super admin can modify any form)
  if (req.user.role !== 'super_admin' && existingForm.rows[0].created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only update your own forms',
      code: 'FORM_ACCESS_DENIED'
    });
  }

  // Validate field IDs are unique within the form
  const fieldIds = fields.map(field => field.id);
  const uniqueFieldIds = [...new Set(fieldIds)];
  if (fieldIds.length !== uniqueFieldIds.length) {
    return res.status(400).json({
      error: 'Field IDs must be unique within the form',
      code: 'DUPLICATE_FIELD_IDS'
    });
  }

  const result = await query(
    `UPDATE forms 
     SET title = $1, description = $2, fields = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at`,
    [title, description, JSON.stringify(fields), isActive, id]
  );

  const updatedForm = result.rows[0];

  res.json({
    message: 'Form updated successfully',
    form: updatedForm
  });
}));

// PUT /api/forms/:id/settings - Update form settings
router.put('/:id/settings', authenticateToken, validateUUID, [
  body('uniqueConstraintType').optional().isIn(['none', 'ip', 'field']).withMessage('Invalid unique constraint type'),
  body('uniqueConstraintField').optional().isString().withMessage('Unique constraint field must be a string'),
  body('showQrCode').optional().isBoolean().withMessage('Show QR code must be a boolean'),
  body('sendEmailNotification').optional().isBoolean().withMessage('Send email notification must be a boolean')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { uniqueConstraintType, uniqueConstraintField, showQrCode, sendEmailNotification } = req.body;

  // Check if form exists and user owns it
  const existingForm = await query(
    'SELECT id, created_by, fields FROM forms WHERE id = $1',
    [id]
  );

  if (existingForm.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found',
      code: 'FORM_NOT_FOUND'
    });
  }

  if (existingForm.rows[0].created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only update your own forms',
      code: 'FORM_ACCESS_DENIED'
    });
  }

  // Validate field constraint
  if (uniqueConstraintType === 'field') {
    if (!uniqueConstraintField) {
      return res.status(400).json({
        error: 'Field ID is required when constraint type is field',
        code: 'FIELD_REQUIRED'
      });
    }
    
    const fields = typeof existingForm.rows[0].fields === 'string' 
      ? JSON.parse(existingForm.rows[0].fields) 
      : existingForm.rows[0].fields;
    
    const fieldExists = fields.some(field => field.id === uniqueConstraintField);
    if (!fieldExists) {
      return res.status(400).json({
        error: 'Selected field does not exist in form',
        code: 'FIELD_NOT_FOUND'
      });
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (uniqueConstraintType !== undefined) {
    updateFields.push(`unique_constraint_type = $${paramIndex}`);
    updateValues.push(uniqueConstraintType);
    paramIndex++;
  }

  if (uniqueConstraintField !== undefined) {
    updateFields.push(`unique_constraint_field = $${paramIndex}`);
    updateValues.push(uniqueConstraintField);
    paramIndex++;
  }

  if (showQrCode !== undefined) {
    updateFields.push(`show_qr_code = $${paramIndex}`);
    updateValues.push(showQrCode);
    paramIndex++;
  }

  if (sendEmailNotification !== undefined) {
    updateFields.push(`send_email_notification = $${paramIndex}`);
    updateValues.push(sendEmailNotification);
    paramIndex++;
  }

  if (updateFields.length === 0) {
    throw new AppError('No valid fields to update', 400, 'NO_FIELDS_TO_UPDATE');
  }

  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateValues.push(id);

  // Update form settings
  const result = await query(
    `UPDATE forms 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at`,
    updateValues
  );

  const form = result.rows[0];

  res.json({
    message: 'Form settings updated successfully',
    form
  });
}));

// POST /api/forms/:id/banner - Upload form banner
router.post('/:id/banner', authenticateToken, validateUUID, upload.single('banner'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  // Check if form exists and user owns it
  const existingForm = await query(
    'SELECT id, created_by, banner_url FROM forms WHERE id = $1',
    [id]
  );

  if (existingForm.rows.length === 0) {
    // Delete uploaded file if form doesn't exist
    fs.unlinkSync(req.file.path);
    throw new AppError('Form not found', 404, 'FORM_NOT_FOUND');
  }

  if (existingForm.rows[0].created_by !== req.user.id) {
    // Delete uploaded file if user doesn't own form
    fs.unlinkSync(req.file.path);
    throw new AppError('You can only update your own forms', 403, 'FORM_ACCESS_DENIED');
  }

  // Delete old banner if exists
  if (existingForm.rows[0].banner_url) {
    const oldBannerPath = path.join(__dirname, '../../uploads', path.basename(existingForm.rows[0].banner_url));
    if (fs.existsSync(oldBannerPath)) {
      fs.unlinkSync(oldBannerPath);
    }
  }

  // Update form with new banner URL
  const bannerUrl = `/api/forms/uploads/${req.file.filename}`;
  const result = await query(
    `UPDATE forms 
     SET banner_url = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at`,
    [bannerUrl, id]
  );

  const form = result.rows[0];
  form.fields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;

  res.json({
    message: 'Banner uploaded successfully',
    form,
    bannerUrl
  });
}));

// DELETE /api/forms/:id/banner - Delete form banner
router.delete('/:id/banner', authenticateToken, validateUUID, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if form exists and user owns it
  const existingForm = await query(
    'SELECT id, created_by, banner_url FROM forms WHERE id = $1',
    [id]
  );

  if (existingForm.rows.length === 0) {
    throw new AppError('Form not found', 404, 'FORM_NOT_FOUND');
  }

  if (existingForm.rows[0].created_by !== req.user.id) {
    throw new AppError('You can only update your own forms', 403, 'FORM_ACCESS_DENIED');
  }

  // Delete banner file if exists
  if (existingForm.rows[0].banner_url) {
    const bannerPath = path.join(__dirname, '../../uploads', path.basename(existingForm.rows[0].banner_url));
    if (fs.existsSync(bannerPath)) {
      fs.unlinkSync(bannerPath);
    }
  }

  // Update form to remove banner URL
  const result = await query(
    `UPDATE forms 
     SET banner_url = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at`,
    [id]
  );

  const form = result.rows[0];
  form.fields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;

  res.json({
    message: 'Banner deleted successfully',
    form
  });
}));

// DELETE /api/forms/:id - Delete form
router.delete('/:id', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if form exists and user owns it
  const existingForm = await query(
    'SELECT id, created_by, title FROM forms WHERE id = $1',
    [id]
  );

  if (existingForm.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found',
      code: 'FORM_NOT_FOUND'
    });
  }

  if (existingForm.rows[0].created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only delete your own forms',
      code: 'FORM_ACCESS_DENIED'
    });
  }

  // Delete form (submissions will be cascade deleted)
  await query('DELETE FROM forms WHERE id = $1', [id]);

  res.json({
    message: 'Form deleted successfully',
    deletedForm: {
      id: existingForm.rows[0].id,
      title: existingForm.rows[0].title
    }
  });
}));

// PATCH /api/forms/:id/toggle - Toggle form active status
router.patch('/:id/toggle', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if form exists and user owns it
  const existingForm = await query(
    'SELECT id, created_by, is_active FROM forms WHERE id = $1',
    [id]
  );

  if (existingForm.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found',
      code: 'FORM_NOT_FOUND'
    });
  }

  if (existingForm.rows[0].created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only modify your own forms',
      code: 'FORM_ACCESS_DENIED'
    });
  }

  const newStatus = !existingForm.rows[0].is_active;

  const result = await query(
    `UPDATE forms 
     SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, title, is_active, updated_at`,
    [newStatus, id]
  );

  const updatedForm = result.rows[0];

  res.json({
    message: `Form ${newStatus ? 'activated' : 'deactivated'} successfully`,
    form: {
      id: updatedForm.id,
      title: updatedForm.title,
      isActive: updatedForm.is_active,
      updatedAt: updatedForm.updated_at
    }
  });
}));

// POST /api/forms/:id/duplicate - Duplicate form
router.post('/:id/duplicate', authenticateToken, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get original form
  const originalForm = await query(
    'SELECT title, description, fields, created_by FROM forms WHERE id = $1',
    [id]
  );

  if (originalForm.rows.length === 0) {
    return res.status(404).json({
      error: 'Form not found',
      code: 'FORM_NOT_FOUND'
    });
  }

  if (originalForm.rows[0].created_by !== req.user.id) {
    return res.status(403).json({
      error: 'You can only duplicate your own forms',
      code: 'FORM_ACCESS_DENIED'
    });
  }

  const form = originalForm.rows[0];
  const newFormId = uuidv4();
  const newTitle = `${form.title} (Copy)`;

  // Create duplicate form
  const result = await query(
    `INSERT INTO forms (id, title, description, fields, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, description, fields, is_active, submission_count, unique_constraint_type, unique_constraint_field, banner_url, show_qr_code, send_email_notification, created_at, updated_at`,
    [newFormId, newTitle, form.description, JSON.stringify(form.fields), false, req.user.id] // Set as inactive by default
  );

  const duplicatedForm = result.rows[0];

  res.status(201).json({
    message: 'Form duplicated successfully',
    form: duplicatedForm
  });
}));

module.exports = router;
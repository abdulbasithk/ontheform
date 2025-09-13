const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Access denied',
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Super admin access required'
    });
  }
  next();
};

// Validation middleware
const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must be less than 255 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin'])
    .withMessage('Role must be either super_admin or admin'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be boolean')
];

const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin'])
    .withMessage('Role must be either super_admin or admin'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be boolean')
];

const validateUUID = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID format')
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

// GET /api/users - Get all users (super admin only)
router.get('/', authenticateToken, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role = '', is_active = '' } = req.query;
  const offset = (page - 1) * limit;

  // Build WHERE clause
  let whereClause = 'WHERE 1=1';
  const queryParams = [];
  let paramIndex = 1;

  if (search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (role) {
    whereClause += ` AND role = $${paramIndex}`;
    queryParams.push(role);
    paramIndex++;
  }

  if (is_active !== '') {
    whereClause += ` AND is_active = $${paramIndex}`;
    queryParams.push(is_active === 'true');
    paramIndex++;
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM user_management_view ${whereClause}`,
    queryParams
  );
  const totalUsers = parseInt(countResult.rows[0].count);

  // Get users with pagination
  const usersResult = await query(
    `SELECT * FROM user_management_view ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  res.json({
    users: usersResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit)
    }
  });
}));

// PUT /api/users/change-password - Change password with current password validation
router.put('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get current user with password hash
  const userResult = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const user = userResult.rows[0];

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, userId]
  );

  res.json({
    message: 'Password changed successfully'
  });
}));

// GET /api/users/:id - Get user by ID (super admin only)
router.get('/:id', authenticateToken, requireSuperAdmin, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({ user: result.rows[0] });
}));

// POST /api/users - Create new user (super admin only)
router.post('/', authenticateToken, requireSuperAdmin, validateUser, handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, email, password, role = 'admin', is_active = true } = req.body;

  // Check if email already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, is_active, created_by) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email, password_hash, role, is_active, req.user.id]
  );

  const newUser = result.rows[0];

  res.status(201).json({
    message: 'User created successfully',
    user: newUser
  });
}));

// PUT /api/users/:id - Update user (super admin only)
router.put('/:id', authenticateToken, requireSuperAdmin, validateUUID, validateUserUpdate, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, is_active } = req.body;

  // Check if user exists
  const existingUser = await query(
    'SELECT id, email FROM users WHERE id = $1',
    [id]
  );

  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if email is being changed and if it already exists
  if (email && email !== existingUser.rows[0].email) {
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
    }
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    updateValues.push(name);
    paramIndex++;
  }

  if (email !== undefined) {
    updateFields.push(`email = $${paramIndex}`);
    updateValues.push(email);
    paramIndex++;
  }

  if (password !== undefined) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    updateFields.push(`password_hash = $${paramIndex}`);
    updateValues.push(password_hash);
    paramIndex++;
  }

  if (role !== undefined) {
    updateFields.push(`role = $${paramIndex}`);
    updateValues.push(role);
    paramIndex++;
  }

  if (is_active !== undefined) {
    updateFields.push(`is_active = $${paramIndex}`);
    updateValues.push(is_active);
    paramIndex++;
  }

  if (updateFields.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_UPDATE_FIELDS');
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(id);

  const result = await query(
    `UPDATE users SET ${updateFields.join(', ')} 
     WHERE id = $${paramIndex} 
     RETURNING id, name, email, role, is_active, updated_at`,
    updateValues
  );

  res.json({
    message: 'User updated successfully',
    user: result.rows[0]
  });
}));

// DELETE /api/users/:id - Delete user (super admin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, validateUUID, handleValidationErrors, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent deleting self
  if (id === req.user.id) {
    throw new AppError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }

  // Check if user exists
  const existingUser = await query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [id]
  );

  if (existingUser.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if user has forms (optional: you might want to transfer ownership or prevent deletion)
  const formsCount = await query(
    'SELECT COUNT(*) FROM forms WHERE created_by = $1',
    [id]
  );

  if (parseInt(formsCount.rows[0].count) > 0) {
    throw new AppError(
      'Cannot delete user with existing forms. Please transfer or delete forms first.',
      400,
      'USER_HAS_FORMS'
    );
  }

  // Delete user
  await query('DELETE FROM users WHERE id = $1', [id]);

  res.json({
    message: 'User deleted successfully',
    deletedUser: existingUser.rows[0]
  });
}));

// GET /api/users/profile - Get current user profile
router.get('/profile/me', authenticateToken, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({ user: result.rows[0] });
}));

// PUT /api/users/profile - Update current user profile
router.put('/profile/me', authenticateToken, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userId = req.user.id;

  // Check if email is being changed and if it already exists
  if (email) {
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );

    if (emailCheck.rows.length > 0) {
      throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
    }
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramIndex}`);
    updateValues.push(name);
    paramIndex++;
  }

  if (email !== undefined) {
    updateFields.push(`email = $${paramIndex}`);
    updateValues.push(email);
    paramIndex++;
  }

  if (password !== undefined) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    updateFields.push(`password_hash = $${paramIndex}`);
    updateValues.push(password_hash);
    paramIndex++;
  }

  if (updateFields.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_UPDATE_FIELDS');
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(userId);

  const result = await query(
    `UPDATE users SET ${updateFields.join(', ')} 
     WHERE id = $${paramIndex} 
     RETURNING id, name, email, role, is_active, updated_at`,
    updateValues
  );

  res.json({
    message: 'Profile updated successfully',
    user: result.rows[0]
  });
}));

module.exports = router;
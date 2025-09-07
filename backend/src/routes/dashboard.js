const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get total forms count
  const formsResult = await query(
    'SELECT COUNT(*) as total FROM forms WHERE created_by = $1',
    [userId]
  );
  const totalForms = parseInt(formsResult.rows[0].total);

  // Get total submissions count
  const submissionsResult = await query(
    `SELECT COUNT(*) as total 
     FROM form_submissions fs 
     JOIN forms f ON fs.form_id = f.id 
     WHERE f.created_by = $1`,
    [userId]
  );
  const totalSubmissions = parseInt(submissionsResult.rows[0].total);

  // Calculate average submissions per form
  const averageSubmissions = totalForms > 0 ? Math.round(totalSubmissions / totalForms) : 0;

  // Get recent submissions count (last 7 days)
  const recentSubmissionsResult = await query(
    `SELECT COUNT(*) as total 
     FROM form_submissions fs 
     JOIN forms f ON fs.form_id = f.id 
     WHERE f.created_by = $1 
     AND fs.submitted_at >= NOW() - INTERVAL '7 days'`,
    [userId]
  );
  const recentSubmissions = parseInt(recentSubmissionsResult.rows[0].total);

  const stats = {
    totalForms,
    totalSubmissions,
    averageSubmissions,
    recentSubmissions
  };

  res.json({ stats });
}));

// Get recent submissions
router.get('/recent-submissions', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 5;

  const result = await query(
    `SELECT 
       fs.id,
       fs.form_id as "formId",
       f.title as "formTitle",
       fs.submitted_at as "submittedAt",
       fs.submitter_email as "submitterEmail",
       fs.responses
     FROM form_submissions fs
     JOIN forms f ON fs.form_id = f.id
     WHERE f.created_by = $1
     ORDER BY fs.submitted_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  const submissions = result.rows.map(row => ({
    ...row,
    submittedAt: row.submittedAt.toISOString(),
    responses: typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses
  }));

  res.json({ submissions });
}));

// Get active forms
router.get('/active-forms', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;

  const result = await query(
    `SELECT 
       f.id,
       f.title,
       f.description,
       f.fields,
       f.is_active,
       f.submission_count,
       f.created_at,
       f.updated_at
     FROM forms f
     WHERE f.created_by = $1 AND f.is_active = true
     ORDER BY f.updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  const forms = result.rows.map(row => ({
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields
  }));

  res.json({ forms });
}));

module.exports = router;
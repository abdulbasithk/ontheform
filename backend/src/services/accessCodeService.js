const { createHash } = require('crypto');
const ExcelJS = require('exceljs');
const { AppError } = require('../middleware/errorHandler');

const hashCode = (code) => {
  if (typeof code !== 'string' || !code.trim() || code.trim().length > 255) {
    throw new AppError('Enter a valid access code', 400, 'INVALID_ACCESS_CODE');
  }
  return createHash('sha256').update(code.trim()).digest('hex');
};

const parseWorkbook = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new AppError('Upload a valid Excel (.xlsx) file', 400, 'INVALID_CODE_FILE');
  }
  const worksheet = workbook.worksheets[0];
  const hashes = new Set();
  if (!worksheet || worksheet.rowCount > 10001) {
    throw new AppError('Upload between 1 and 10,000 codes', 400, 'INVALID_CODE_FILE');
  }
  worksheet.eachRow((row, rowNumber) => {
    const cell = row.getCell(1);
    if (cell.value === null || cell.text.trim() === '') return;
    if (rowNumber === 1 && cell.text.trim().toLowerCase() === 'code') return;
    if (![ExcelJS.ValueType.String, ExcelJS.ValueType.Number].includes(cell.type)) {
      throw new AppError(`Row ${rowNumber}: codes must be text or numbers, not formulas`, 400, 'INVALID_CODE_FILE');
    }
    hashes.add(hashCode(cell.text));
  });
  if (!hashes.size || hashes.size > 10000) {
    throw new AppError('Upload between 1 and 10,000 codes', 400, 'INVALID_CODE_FILE');
  }
  return [...hashes];
};

const validateAccessCode = async (client, formId, code, lock = false) => {
  const result = await client.query(
    `SELECT access_code_required, access_code_single_use FROM forms WHERE id = $1 AND is_active = true${lock ? ' FOR UPDATE' : ''}`,
    [formId]
  );
  const form = result.rows[0];
  if (!form) throw new AppError('Form not found or inactive', 404, 'FORM_NOT_FOUND');
  if (!form.access_code_required) return null;
  const codeHash = hashCode(code);
  const codes = await client.query(
    `SELECT code_hash, used_at FROM form_access_codes WHERE form_id = $1 AND code_hash = $2${lock ? ' FOR UPDATE' : ''}`,
    [formId, codeHash]
  );
  if (!codes.rows.length || (form.access_code_single_use && codes.rows[0].used_at)) {
    throw new AppError('Invalid or already used access code', 400, 'INVALID_ACCESS_CODE');
  }
  return codeHash;
};

module.exports = { hashCode, parseWorkbook, validateAccessCode };
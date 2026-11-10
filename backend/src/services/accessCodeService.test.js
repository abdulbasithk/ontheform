const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { hashCode, parseWorkbook, validateAccessCode } = require('./accessCodeService');

jest.mock('../config/database', () => {
  const query = jest.fn();
  return { query, transaction: jest.fn(async (work) => work({ query })) };
});
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    if (!req.get('Authorization')) return res.status(401).json({ code: 'UNAUTHORIZED' });
    req.user = { id: 'owner', role: 'admin' };
    next();
  },
  optionalAuth: (req, res, next) => next()
}));
jest.mock('./emailService', () => ({}));

test('codes trim whitespace but remain case-sensitive and reject invalid input', () => {
  assert.equal(hashCode(' ABC '), hashCode('ABC'));
  assert.notEqual(hashCode('ABC'), hashCode('abc'));
  for (const value of [undefined, '', ' ', 123, 'a'.repeat(256)]) {
    assert.throws(() => hashCode(value), { code: 'INVALID_ACCESS_CODE' });
  }
});

test('Excel import accepts an optional header, preserves text zeros and deduplicates', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Codes').addRows([['code'], ['00123'], [' ABC '], ['ABC'], [456]]);
  assert.deepEqual(await parseWorkbook(await workbook.xlsx.writeBuffer()), [hashCode('00123'), hashCode('ABC'), hashCode('456')]);
});

test('Excel import rejects empty, malformed and formula workbooks', async () => {
  await assert.rejects(parseWorkbook(Buffer.from('not Excel')), { code: 'INVALID_CODE_FILE' });
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Codes');
  await assert.rejects(parseWorkbook(await workbook.xlsx.writeBuffer()), { code: 'INVALID_CODE_FILE' });
  worksheet.getCell('A1').value = { formula: '1+1', result: 2 };
  await assert.rejects(parseWorkbook(await workbook.xlsx.writeBuffer()), { code: 'INVALID_CODE_FILE' });
});

test('validation rejects missing, unknown, and consumed single-use codes', async () => {
  const client = { query: async (sql) => ({ rows: sql.includes('FROM forms')
    ? [{ access_code_required: true, access_code_single_use: true }]
    : [{ used_at: new Date() }] }) };
  await assert.rejects(validateAccessCode(client, 'form', undefined), { code: 'INVALID_ACCESS_CODE' });
  await assert.rejects(validateAccessCode(client, 'form', 'ABC'), { code: 'INVALID_ACCESS_CODE' });
  const unknown = { query: async (sql) => ({ rows: sql.includes('FROM forms')
    ? [{ access_code_required: true }] : [] }) };
  await assert.rejects(validateAccessCode(unknown, 'form', 'ABC'), { code: 'INVALID_ACCESS_CODE' });
});

test('reusable codes accept previous use and submission validation locks rows', async () => {
  const statements = [];
  const client = { query: async (sql) => {
    statements.push(sql);
    return { rows: sql.includes('FROM forms')
      ? [{ access_code_required: true, access_code_single_use: false }]
      : [{ used_at: new Date() }] };
  } };
  assert.equal(await validateAccessCode(client, 'form', 'ABC', true), hashCode('ABC'));
  assert.match(statements[0], /FOR UPDATE$/);
  assert.match(statements[1], /FOR UPDATE$/);
});

test('disabled gates do not require a code; inactive forms are rejected', async () => {
  assert.equal(await validateAccessCode({ query: async () => ({ rows: [{ access_code_required: false }] }) }, 'form'), null);
  await assert.rejects(validateAccessCode({ query: async () => ({ rows: [] }) }, 'form', 'ABC'), { code: 'FORM_NOT_FOUND' });
});

describe('access-code API enforcement', () => {
  const express = require('express');
  const request = require('supertest');
  const database = require('../config/database');
  const formId = 'c0a80101-1234-4567-89ab-0123456789ab';
  const app = express();
  app.use(express.json());
  app.use('/api/forms', require('../routes/forms'));
  app.use('/api/submissions', require('../routes/submissions'));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ code: error.code }));
  let form;
  let usedAt;
  let failInsert;

  beforeEach(() => {
    usedAt = null;
    failInsert = false;
    form = { id: formId, created_by: 'owner', title: 'Test form', fields: [], access_code_required: true, access_code_single_use: true };
    database.transaction.mockClear();
    database.query.mockReset().mockImplementation(async (sql, params) => {
      if (sql.includes('INSERT INTO form_submissions')) {
        if (failInsert) throw new Error('Insert failed');
        return { rows: [{ id: params[0], form_id: formId, submitted_at: new Date() }] };
      }
      if (sql.includes('UPDATE form_access_codes')) {
        usedAt = new Date();
        return { rowCount: 1 };
      }
      if (sql.includes('INSERT INTO form_access_codes')) return { rowCount: params[1].length };
      if (sql.includes('FROM form_access_codes')) {
        return { rows: params[1] === hashCode('ABC') ? [{ code_hash: params[1], used_at: usedAt }] : [] };
      }
      if (sql.includes('FROM forms')) return { rows: [form] };
      if (sql.includes('UPDATE forms')) return { rows: [form] };
      throw new Error(`Unexpected SQL: ${sql}`);
    });
  });

  test('public validation does not consume or expose the code', async () => {
    const response = await request(app).post(`/api/forms/${formId}/access-codes/validate`).send({ code: 'ABC' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { valid: true });
    assert.equal(usedAt, null);
  });

  test('direct submissions cannot skip the code gate', async () => {
    const response = await request(app).post('/api/submissions').send({ formId, responses: {} });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'INVALID_ACCESS_CODE');
    assert.equal(database.transaction.mock.calls.length, 0);
  });

  test.each(['json', 'multipart'])('%s submissions revalidate and consume the code after insertion', async (transport) => {
    const submission = request(app).post('/api/submissions');
    const response = transport === 'json'
      ? await submission.send({ formId, responses: {}, accessCode: 'ABC' })
      : await submission.field('formId', formId).field('responses', '{}').field('accessCode', 'ABC');
    assert.equal(response.status, 201);
    assert.ok(usedAt);
    assert.equal(database.transaction.mock.calls.length, 1);
    const statements = database.query.mock.calls.map(([sql]) => sql);
    const insertIndex = statements.findIndex((sql) => sql.includes('INSERT INTO form_submissions'));
    assert.ok(statements.findIndex((sql) => sql.includes('UPDATE form_access_codes')) > insertIndex);
    assert.ok(statements.slice(0, insertIndex).some((sql) => sql.includes('FOR UPDATE')));
  });

  test('used single-use codes fail but reusable codes can submit again', async () => {
    usedAt = new Date();
    const rejected = await request(app).post('/api/submissions').send({ formId, responses: {}, accessCode: 'ABC' });
    assert.equal(rejected.status, 400);
    form.access_code_single_use = false;
    const accepted = await request(app).post('/api/submissions').send({ formId, responses: {}, accessCode: 'ABC' });
    assert.equal(accepted.status, 201);
  });

  test('invalid responses and failed inserts do not mark codes as consumed', async () => {
    form.fields = [{ id: 'name', type: 'text', label: 'Name', required: true }];
    const invalid = await request(app).post('/api/submissions').send({ formId, responses: {}, accessCode: 'ABC' });
    assert.equal(invalid.status, 400);
    assert.equal(usedAt, null);
    form.fields = [];
    failInsert = true;
    const failed = await request(app).post('/api/submissions').send({ formId, responses: {}, accessCode: 'ABC' });
    assert.equal(failed.status, 500);
    assert.equal(usedAt, null);
  });

  test('disabled code gates preserve existing submissions', async () => {
    form.access_code_required = false;
    const response = await request(app).post('/api/submissions').send({ formId, responses: {} });
    assert.equal(response.status, 201);
    assert.equal(usedAt, null);
  });

  test('code imports require authentication and ownership', async () => {
    const unauthenticated = await request(app).post(`/api/forms/${formId}/access-codes`);
    assert.equal(unauthenticated.status, 401);
    form.created_by = 'someone-else';
    const forbidden = await request(app).post(`/api/forms/${formId}/access-codes`).set('Authorization', 'test');
    assert.equal(forbidden.status, 403);
  });

  test('Excel imports store hashes and not plaintext codes', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Codes').addRows([['code'], ['ABC'], ['00123'], ['ABC']]);
    const response = await request(app).post(`/api/forms/${formId}/access-codes`).set('Authorization', 'test')
      .attach('file', Buffer.from(await workbook.xlsx.writeBuffer()), 'codes.xlsx');
    assert.equal(response.status, 200);
    assert.equal(response.body.imported, 2);
    const insert = database.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO form_access_codes'));
    assert.deepEqual(insert[1][1], [hashCode('ABC'), hashCode('00123')]);
  });

  test('oversized imports return a useful client error', async () => {
    const response = await request(app).post(`/api/forms/${formId}/access-codes`).set('Authorization', 'test')
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1), 'codes.xlsx');
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'INVALID_CODE_FILE');
  });

  test('settings accept false booleans and return access-code configuration', async () => {
    const response = await request(app).put(`/api/forms/${formId}/settings`).set('Authorization', 'test')
      .send({ accessCodeRequired: false, accessCodeSingleUse: false });
    assert.equal(response.status, 200);
    const update = database.query.mock.calls.find(([sql]) => sql.includes('UPDATE forms'));
    assert.deepEqual(update[1], [false, false, formId]);
    assert.match(update[0], /RETURNING[\s\S]*access_code_required, access_code_single_use/);
  });

  test('ordinary form edits preserve access-code settings in their response', async () => {
    const response = await request(app).put(`/api/forms/${formId}`).set('Authorization', 'test')
      .send({ title: 'Updated', fields: [{ id: 'name', type: 'text', label: 'Name', required: true }], isActive: true });
    assert.equal(response.status, 200);
    const update = database.query.mock.calls.find(([sql]) => sql.includes('UPDATE forms'));
    assert.match(update[0], /RETURNING[\s\S]*access_code_required, access_code_single_use/);
    assert.match(update[0], /access_code_title, access_code_description/);
  });

  test('code-screen content is trimmed, saved and returned without changing form content', async () => {
    const response = await request(app).put(`/api/forms/${formId}/settings`).set('Authorization', 'test')
      .send({ accessCodeTitle: '  Enter your invitation code  ', accessCodeDescription: '  Welcome!\nYour invitation code is required.  ' });
    assert.equal(response.status, 200);
    const update = database.query.mock.calls.find(([sql]) => sql.includes('UPDATE forms'));
    assert.deepEqual(update[1], ['Enter your invitation code', 'Welcome!\nYour invitation code is required.', formId]);
    assert.match(update[0], /SET access_code_title = \$1, access_code_description = \$2/);
    assert.match(update[0], /RETURNING[\s\S]*access_code_title, access_code_description/);
  });

  test('code-screen content can be cleared to restore defaults', async () => {
    const response = await request(app).put(`/api/forms/${formId}/settings`).set('Authorization', 'test')
      .send({ accessCodeTitle: '', accessCodeDescription: '' });
    assert.equal(response.status, 200);
    const update = database.query.mock.calls.find(([sql]) => sql.includes('UPDATE forms'));
    assert.deepEqual(update[1], ['', '', formId]);
  });

  test.each([
    { accessCodeTitle: 'a'.repeat(256) },
    { accessCodeDescription: 'a'.repeat(1001) },
    { accessCodeTitle: { text: 'Not a string' } },
    { accessCodeDescription: 42 }
  ])('invalid code-screen content is rejected: %j', async (content) => {
    const response = await request(app).put(`/api/forms/${formId}/settings`).set('Authorization', 'test').send(content);
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
    assert.equal(database.query.mock.calls.length, 0);
  });

  test('code-screen content updates require form ownership', async () => {
    form.created_by = 'someone-else';
    const response = await request(app).put(`/api/forms/${formId}/settings`).set('Authorization', 'test')
      .send({ accessCodeTitle: 'Unauthorized change' });
    assert.equal(response.status, 403);
  });

  test('public form responses select custom code-screen content', async () => {
    const response = await request(app).get(`/api/forms/${formId}`);
    assert.equal(response.status, 200);
    const select = database.query.mock.calls.find(([sql]) => sql.includes('FROM forms'));
    assert.match(select[0], /access_code_title, access_code_description/);
  });
});
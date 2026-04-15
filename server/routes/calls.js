const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/calls
router.get('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { outcome, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'tenant_id = ?';
  const params = [tenantId];

  if (outcome) { where += ' AND outcome = ?'; params.push(outcome); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM call_sessions WHERE ${where}`).get(...params);
  params.push(parseInt(limit), offset);

  const calls = db.prepare(`
    SELECT * FROM call_sessions WHERE ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  const parsed = calls.map(c => ({
    ...c,
    extracted_intent: tryParse(c.extracted_intent),
  }));

  res.json({ calls: parsed, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

function tryParse(str) {
  try { return JSON.parse(str); } catch { return str; }
}

module.exports = router;

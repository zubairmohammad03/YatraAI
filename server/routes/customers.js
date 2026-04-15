const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/customers
router.get('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { search, city, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'tenant_id = ?';
  const params = [tenantId];

  if (city) { where += ' AND city = ?'; params.push(city); }
  if (search) {
    where += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE ${where}`).get(...params);
  params.push(parseInt(limit), offset);

  const customers = db.prepare(`
    SELECT * FROM customers WHERE ${where}
    ORDER BY total_spend DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  res.json({ customers, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/customers
router.post('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { name, phone, city } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(`
    INSERT INTO customers (tenant_id, name, phone, city)
    VALUES (?, ?, ?, ?)
  `).run(tenantId, name, phone || null, city || null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

module.exports = router;

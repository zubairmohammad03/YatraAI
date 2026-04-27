const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/tours
router.get('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const tours = db.prepare('SELECT * FROM tour_packages WHERE tenant_id = ? ORDER BY price').all(tenantId);

  const parsed = tours.map(t => ({
    ...t,
    inclusions: tryParse(t.inclusions),
  }));

  res.json(parsed);
});

// POST /api/tours
router.post('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { name, description, duration_days, price, inclusions } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const inclusionsStr = Array.isArray(inclusions) ? JSON.stringify(inclusions) : (inclusions || null);

  const result = db.prepare(`
    INSERT INTO tour_packages (tenant_id, name, description, duration_days, price, inclusions)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tenantId, name, description || null, duration_days || 1, price || 0, inclusionsStr);

  const tour = db.prepare('SELECT * FROM tour_packages WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...tour, inclusions: tryParse(tour.inclusions) });
});

// PUT /api/tours/:id
router.put('/:id', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM tour_packages WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  if (!existing) return res.status(404).json({ error: 'Tour package not found' });

  const b = req.body;
  const n = v => (v !== undefined) ? v : null;
  const inclusionsStr = Array.isArray(b.inclusions) ? JSON.stringify(b.inclusions) : n(b.inclusions);

  db.prepare(`
    UPDATE tour_packages SET
      name          = COALESCE(?, name),
      description   = COALESCE(?, description),
      duration_days = COALESCE(?, duration_days),
      price         = COALESCE(?, price),
      inclusions    = COALESCE(?, inclusions)
    WHERE id = ? AND tenant_id = ?
  `).run(n(b.name), n(b.description), n(b.duration_days), n(b.price), inclusionsStr, id, tenantId);

  const updated = db.prepare('SELECT * FROM tour_packages WHERE id = ?').get(id);
  res.json({ ...updated, inclusions: tryParse(updated.inclusions) });
});

function tryParse(str) {
  try { return JSON.parse(str); } catch { return str; }
}

module.exports = router;

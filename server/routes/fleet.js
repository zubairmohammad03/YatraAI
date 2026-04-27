const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/fleet
router.get('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { status, type } = req.query;

  let where = 'tenant_id = ?';
  const params = [tenantId];

  if (status) { where += ' AND status = ?'; params.push(status); }
  if (type) { where += ' AND type LIKE ?'; params.push(`%${type}%`); }

  const vehicles = db.prepare(`SELECT * FROM vehicles WHERE ${where} ORDER BY type`).all(...params);
  res.json(vehicles);
});

// POST /api/fleet
router.post('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { type, registration, capacity, status = 'available', rate_per_day, rate_per_km, rate_airport, rate_hourly } = req.body;

  if (!type || !registration) {
    return res.status(400).json({ error: 'type and registration are required' });
  }

  const result = db.prepare(`
    INSERT INTO vehicles (tenant_id, type, registration, capacity, status, rate_per_day, rate_per_km, rate_airport, rate_hourly)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tenantId, type, registration, capacity || 4, status, rate_per_day || 0, rate_per_km || 0, rate_airport || 0, rate_hourly || 0);

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(vehicle);
});

// PUT /api/fleet/:id
router.put('/:id', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  const b = req.body;
  const n = v => (v !== undefined && v !== '') ? v : null;

  db.prepare(`
    UPDATE vehicles SET
      type         = COALESCE(?, type),
      registration = COALESCE(?, registration),
      capacity     = COALESCE(?, capacity),
      status       = COALESCE(?, status),
      rate_per_day = COALESCE(?, rate_per_day),
      rate_per_km  = COALESCE(?, rate_per_km),
      rate_airport = COALESCE(?, rate_airport),
      rate_hourly  = COALESCE(?, rate_hourly)
    WHERE id = ? AND tenant_id = ?
  `).run(n(b.type), n(b.registration), n(b.capacity), n(b.status),
         n(b.rate_per_day), n(b.rate_per_km), n(b.rate_airport), n(b.rate_hourly),
         id, tenantId);

  const updated = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/fleet/:id
router.delete('/:id', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare('DELETE FROM vehicles WHERE id = ? AND tenant_id = ?').run(id, tenantId);
  res.json({ message: 'Vehicle deleted' });
});

module.exports = router;

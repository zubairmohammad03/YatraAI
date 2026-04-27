const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function generateRef(tenantId) {
  const ts = Date.now().toString(36).toUpperCase();
  return `BK-${tenantId}-${ts}`;
}

// GET /api/bookings
router.get('/', auth, (req, res) => {
  const { status, source, search, page = 1, limit = 20 } = req.query;
  const tenantId = req.user.tenant_id;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'b.tenant_id = ?';
  const params = [tenantId];

  if (status) { where += ' AND b.status = ?'; params.push(status); }
  if (source) { where += ' AND b.source = ?'; params.push(source); }
  if (search) {
    where += ' AND (b.customer_name LIKE ? OR b.booking_ref LIKE ? OR b.pickup LIKE ? OR b.dropoff LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM bookings b WHERE ${where}`).get(...params);

  params.push(parseInt(limit), offset);
  const bookings = db.prepare(`
    SELECT b.*, v.type as vehicle_type, v.registration
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE ${where}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  res.json({ bookings, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

// POST /api/bookings
router.post('/', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const {
    customer_name, customer_phone, pickup, dropoff, vehicle_id,
    start_date, end_date, amount, status = 'pending', source = 'manual',
  } = req.body;

  if (!customer_name) {
    return res.status(400).json({ error: 'customer_name is required' });
  }

  const booking_ref = generateRef(tenantId);

  const result = db.prepare(`
    INSERT INTO bookings (tenant_id, booking_ref, customer_name, customer_phone, pickup, dropoff, vehicle_id, start_date, end_date, amount, status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tenantId, booking_ref, customer_name, customer_phone || null, pickup || null, dropoff || null, vehicle_id || null, start_date || null, end_date || null, amount || 0, status, source);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(booking);
});

// PUT /api/bookings/:id
router.put('/:id', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM bookings WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  const b = req.body;
  // node:sqlite requires null not undefined
  const n = v => (v !== undefined && v !== '') ? v : null;

  db.prepare(`
    UPDATE bookings SET
      customer_name  = COALESCE(?, customer_name),
      customer_phone = COALESCE(?, customer_phone),
      pickup         = COALESCE(?, pickup),
      dropoff        = COALESCE(?, dropoff),
      vehicle_id     = COALESCE(?, vehicle_id),
      start_date     = COALESCE(?, start_date),
      end_date       = COALESCE(?, end_date),
      amount         = COALESCE(?, amount),
      status         = COALESCE(?, status),
      source         = COALESCE(?, source)
    WHERE id = ? AND tenant_id = ?
  `).run(n(b.customer_name), n(b.customer_phone), n(b.pickup), n(b.dropoff),
         n(b.vehicle_id), n(b.start_date), n(b.end_date), n(b.amount),
         n(b.status), n(b.source), id, tenantId);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/bookings/:id
router.delete('/:id', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM bookings WHERE id = ? AND tenant_id = ?').get(id, tenantId);
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  db.prepare('DELETE FROM bookings WHERE id = ? AND tenant_id = ?').run(id, tenantId);
  res.json({ message: 'Booking deleted' });
});

module.exports = router;

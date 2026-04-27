const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', auth, (req, res) => {
  const tenantId = req.user.tenant_id;

  const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ?').get(tenantId);
  const pendingBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ? AND status = 'pending'").get(tenantId);
  const confirmedBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ? AND status = 'confirmed'").get(tenantId);
  const completedBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE tenant_id = ? AND status = 'completed'").get(tenantId);

  const revenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM bookings
    WHERE tenant_id = ? AND status IN ('confirmed', 'completed')
  `).get(tenantId);

  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?').get(tenantId);

  const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE tenant_id = ?').get(tenantId);
  const availableVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE tenant_id = ? AND status = 'available'").get(tenantId);

  const totalCalls = db.prepare('SELECT COUNT(*) as count FROM call_sessions WHERE tenant_id = ?').get(tenantId);

  const recentBookings = db.prepare(`
    SELECT b.*, v.type as vehicle_type
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.tenant_id = ?
    ORDER BY b.created_at DESC
    LIMIT 5
  `).all(tenantId);

  const monthlyRevenue = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COALESCE(SUM(amount), 0) as revenue,
      COUNT(*) as bookings
    FROM bookings
    WHERE tenant_id = ? AND status IN ('confirmed', 'completed')
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all(tenantId);

  res.json({
    stats: {
      totalBookings: totalBookings.count,
      pendingBookings: pendingBookings.count,
      confirmedBookings: confirmedBookings.count,
      completedBookings: completedBookings.count,
      totalRevenue: revenue.total,
      totalCustomers: totalCustomers.count,
      totalVehicles: totalVehicles.count,
      availableVehicles: availableVehicles.count,
      totalCalls: totalCalls.count,
    },
    recentBookings,
    monthlyRevenue: monthlyRevenue.reverse(),
  });
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id);

  const token = jwt.sign(
    { id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: { id: tenant.id, name: tenant.name, short_name: tenant.short_name, brand_color: tenant.brand_color, plan: tenant.plan },
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, tenant_name, short_name, brand_color, phone, plan } = req.body;

  if (!name || !email || !password || !tenant_name || !short_name) {
    return res.status(400).json({ error: 'name, email, password, tenant_name, and short_name are required' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const existingTenant = db.prepare('SELECT id FROM tenants WHERE short_name = ?').get(short_name);
  if (existingTenant) {
    return res.status(409).json({ error: 'Tenant short_name already taken' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const tenantResult = db.prepare(`
    INSERT INTO tenants (name, short_name, brand_color, phone, plan)
    VALUES (?, ?, ?, ?, ?)
  `).run(tenant_name, short_name, brand_color || '#FF6B00', phone || null, plan || 'starter');

  const tenantId = tenantResult.lastInsertRowid;

  db.prepare(`
    INSERT INTO users (tenant_id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(tenantId, name, email, passwordHash, 'admin');

  // Create default agent config for new tenant
  db.prepare(`
    INSERT INTO agent_config (tenant_id, agent_name, voice, languages, greeting, auto_confirm_below)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(tenantId, 'Yatra', 'female', 'Hindi,English', 'Namaste! Main aapki yatra mein madad kar sakta hoon.', 5000);

  const token = jwt.sign(
    { id: tenantId, tenant_id: tenantId, email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { name, email, role: 'admin' },
    tenant: { id: tenantId, name: tenant_name, short_name, brand_color: brand_color || '#FF6B00', plan: plan || 'starter' },
  });
});

module.exports = router;

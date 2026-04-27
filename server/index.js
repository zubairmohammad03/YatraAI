require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');

const db = require('./db'); // runs migrations on import
const { setupWebSocket } = require('./services/websocket');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const bookingRoutes   = require('./routes/bookings');
const fleetRoutes     = require('./routes/fleet');
const customerRoutes  = require('./routes/customers');
const tourRoutes      = require('./routes/tours');
const callRoutes      = require('./routes/calls');
const agentRoutes     = require('./routes/agent');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'YatraAI Backend', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/fleet',     fleetRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tours',     tourRoutes);
app.use('/api/calls',     callRoutes);
app.use('/api',           agentRoutes); // handles /api/agent-config, /api/agent/chat

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'yatraai-whitelabel.html'));
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ── HTTP + WebSocket Server ───────────────────────────────────────────────────
const server = http.createServer(app);
const wss = setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 YatraAI Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`\nRoutes available:`);
  console.log(`  POST   /api/auth/login`);
  console.log(`  POST   /api/auth/register`);
  console.log(`  GET    /api/dashboard/stats`);
  console.log(`  GET    /api/bookings`);
  console.log(`  POST   /api/bookings`);
  console.log(`  PUT    /api/bookings/:id`);
  console.log(`  DELETE /api/bookings/:id`);
  console.log(`  GET    /api/fleet`);
  console.log(`  POST   /api/fleet`);
  console.log(`  PUT    /api/fleet/:id`);
  console.log(`  DELETE /api/fleet/:id`);
  console.log(`  GET    /api/customers`);
  console.log(`  POST   /api/customers`);
  console.log(`  GET    /api/tours`);
  console.log(`  POST   /api/tours`);
  console.log(`  PUT    /api/tours/:id`);
  console.log(`  GET    /api/calls`);
  console.log(`  GET    /api/agent-config`);
  console.log(`  PUT    /api/agent-config`);
  console.log(`  POST   /api/agent/chat`);
  console.log(`\n  GET    /health`);
});

module.exports = { app, server, wss };

const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { chatWithAgent } = require('../services/aiAgent');

const router = express.Router();

// GET /api/agent-config
router.get('/agent-config', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const config = db.prepare('SELECT * FROM agent_config WHERE tenant_id = ?').get(tenantId);

  if (!config) {
    return res.status(404).json({ error: 'Agent config not found' });
  }

  res.json({
    ...config,
    languages: config.languages ? config.languages.split(',') : ['Hindi', 'English'],
  });
});

// PUT /api/agent-config
router.put('/agent-config', auth, (req, res) => {
  const tenantId = req.user.tenant_id;
  const { agent_name, voice, languages, greeting, auto_confirm_below } = req.body;

  const n = v => (v !== undefined) ? v : null;
  const languagesStr = Array.isArray(languages) ? languages.join(',') : n(languages);

  const existing = db.prepare('SELECT id FROM agent_config WHERE tenant_id = ?').get(tenantId);

  if (existing) {
    db.prepare(`
      UPDATE agent_config SET
        agent_name         = COALESCE(?, agent_name),
        voice              = COALESCE(?, voice),
        languages          = COALESCE(?, languages),
        greeting           = COALESCE(?, greeting),
        auto_confirm_below = COALESCE(?, auto_confirm_below)
      WHERE tenant_id = ?
    `).run(n(agent_name), n(voice), languagesStr, n(greeting), n(auto_confirm_below), tenantId);
  } else {
    db.prepare(`
      INSERT INTO agent_config (tenant_id, agent_name, voice, languages, greeting, auto_confirm_below)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tenantId, agent_name || 'Yatra', voice || 'female', languagesStr || 'Hindi,English', greeting || 'Namaste!', auto_confirm_below || 5000);
  }

  const config = db.prepare('SELECT * FROM agent_config WHERE tenant_id = ?').get(tenantId);
  res.json({
    ...config,
    languages: config.languages ? config.languages.split(',') : ['Hindi', 'English'],
  });
});

// POST /api/agent/chat
router.post('/agent/chat', auth, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { message, session_id, conversation_history = [] } = req.body;

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const result = await chatWithAgent({ message, session_id, conversation_history, tenant_id: tenantId });
    res.json(result);
  } catch (err) {
    console.error('Agent chat error:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'AI agent error', details: err.message });
  }
});

module.exports = router;

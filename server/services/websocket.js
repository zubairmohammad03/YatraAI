const { WebSocketServer } = require('ws');
const db = require('../db');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    console.log('[WS] Client connected');

    ws.send(JSON.stringify({ event: 'connected', message: 'YatraAI WebSocket ready' }));

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ event: 'error', message: 'Invalid JSON' }));
        return;
      }

      if (msg.event === 'simulate_call') {
        simulateLiveCall(ws, msg.tenant_id || 1, msg.caller_number || '+91-9999999999');
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
    });
  });

  return wss;
}

function broadcast(wss, event, data) {
  const payload = JSON.stringify({ event, ...data, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
}

function simulateLiveCall(ws, tenantId, callerNumber) {
  const sessionId = `CALL-${Date.now()}`;

  const send = (event, data) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ event, session_id: sessionId, ...data, timestamp: new Date().toISOString() }));
    }
  };

  // Step 1: Call started
  send('call_started', {
    caller_number: callerNumber,
    message: 'Incoming call connected',
  });

  // Step 2: Transcript chunks
  const transcript = [
    { delay: 1500, speaker: 'agent',    text: 'Namaste! Main Yatra hoon, Shree Ram Travels ki AI assistant. Aap kaise madad kar sakta hoon?' },
    { delay: 3500, speaker: 'customer', text: 'Haan, mujhe Delhi se Manali jaana hai 5 logon ke saath.' },
    { delay: 5500, speaker: 'agent',    text: 'Bilkul! Manali ke liye hum Tempo Traveller suggest karenge jo 14 seater hai. Kab jaana chahte hain?' },
    { delay: 8000, speaker: 'customer', text: 'Next month, 15 tarikh ko.' },
    { delay: 10000, speaker: 'agent',   text: 'Theek hai. Tempo Traveller ka rate ₹8500 per day hai. 2 din ka trip ho to ₹17000 plus driver charges.' },
  ];

  for (const chunk of transcript) {
    setTimeout(() => {
      send('transcript_update', {
        speaker: chunk.speaker,
        text: chunk.text,
      });
    }, chunk.delay);
  }

  // Step 3: Intent extracted
  setTimeout(() => {
    send('intent_extracted', {
      intent: {
        destination: 'Manali',
        vehicle: 'Tempo Traveller',
        dates: 'Next month 15th, 2 days',
        pax: 5,
        budget: 20000,
        intent_type: 'booking',
        should_auto_book: false,
        suggested_price: 17000,
      },
    });
  }, 12000);

  // Step 4: Booking created
  setTimeout(() => {
    const bookingRef = `BK-WS-${Date.now().toString(36).toUpperCase()}`;

    // Save call session to DB
    try {
      db.prepare(`
        INSERT INTO call_sessions (tenant_id, caller_number, transcript, extracted_intent, outcome, duration_secs)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        callerNumber,
        transcript.map(t => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n'),
        JSON.stringify({ destination: 'Manali', vehicle: 'Tempo Traveller', dates: 'Next month 15th', pax: 5, budget: 20000 }),
        'booked',
        16
      );
    } catch (err) {
      console.error('[WS] DB insert error:', err.message);
    }

    send('booking_created', {
      booking_ref: bookingRef,
      customer: callerNumber,
      details: {
        pickup: 'Delhi',
        dropoff: 'Manali',
        vehicle: 'Tempo Traveller',
        start_date: 'Next month 15th',
        amount: 17000,
        status: 'pending',
      },
    });
  }, 14000);

  // Step 5: Call ended
  setTimeout(() => {
    send('call_ended', {
      duration_secs: 16,
      outcome: 'booked',
      message: 'Call completed successfully',
    });
  }, 16000);
}

module.exports = { setupWebSocket, broadcast, simulateLiveCall };

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(express.json());
app.use(express.static("../"));

// ─── Mock Distance Table ────────────────────────────────────────────────────
const DISTANCES = {
  "hyderabad-bangalore": 570,
  "bangalore-hyderabad": 570,
  "hyderabad-vijayawada": 275,
  "vijayawada-hyderabad": 275,
  "hyderabad-chennai": 630,
  "chennai-hyderabad": 630,
  "hyderabad-mumbai": 710,
  "mumbai-hyderabad": 710,
  "hyderabad-delhi": 1500,
  "delhi-hyderabad": 1500,
};

const RATES = { sedan: 12, suv: 18, tempo: 22 };
const MIN_FARE = 500;
const DEFAULT_DISTANCE = 300;

// ─── SESSION MEMORY ─────────────────────────────────────────────
const sessions = {};

function getDistance(pickup, drop) {
  if (!pickup || !drop) return null;
  const key = `${pickup.toLowerCase().trim()}-${drop.toLowerCase().trim()}`;
  return DISTANCES[key] || DEFAULT_DISTANCE;
}

function calcPrice(vehicle, pickup, drop) {
  if (!vehicle) return null;
  const rate = RATES[vehicle.toLowerCase()] || RATES.sedan;
  const dist = getDistance(pickup, drop) || DEFAULT_DISTANCE;
  const price = Math.max(dist * rate, MIN_FARE);
  return { price, dist, rate };
}

// ─── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI voice agent for an Indian car rental and travel company called "YatraWheels".
Your role:
- Answer like a real, friendly Indian travel agent
- Speak in Hindi, English, or Hinglish based on user input language
- Be warm, conversational, and helpful

Your responsibilities:
1. Detect intent: booking / pricing / inquiry / support / greeting
2. Extract from user message:
   - pickup location (city)
   - drop location (city)
   - date (today/tomorrow/specific date)
   - time
   - vehicle type (sedan, suv, tempo)
3. Estimate price using these rates:
   - sedan = ₹12/km
   - SUV = ₹18/km
   - tempo = ₹22/km
   - minimum ₹500
4. If any key info is missing, ask for it naturally (one question at a time)
5. When all details are available, confirm the booking with a summary

Important behavior:
- Handle Hinglish naturally ("cab chahiye", "kab milega", "kitna paisa lagega")
- Handle short queries like "cab chahiye" by asking pickup/drop
- Be concise — don't repeat the entire booking summary on every message
- For greetings, respond warmly and ask how you can help

ALWAYS output ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "intent": "booking|pricing|inquiry|support|greeting|followup",
  "entities": {
    "pickup": "",
    "drop": "",
    "date": "",
    "time": "",
    "vehicle": ""
  },
  "response": "Your conversational reply here (in same language as user)",
  "price_estimate": "",
  "booking_complete": false
}

Rules:
- Keep empty string "" for unknown entities, never null
- price_estimate: fill only when you have vehicle + route (e.g. "₹6,840 approx")
- booking_complete: true only when all 5 entities are confirmed
- response must be warm, natural, conversational — not robotic
`;

// ─── POST /chat ──────────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in .env" });
  }

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Claude API error:", errText);
      return res.status(apiRes.status).json({ error: "Claude API error", detail: errText });
    }

    const data = await apiRes.json();
    const rawText = data.content?.[0]?.text || "{}";

    // Parse JSON from Claude
    let parsed;
    try {
      const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse error:", rawText);
      parsed = {
        intent: "inquiry",
        entities: { pickup: "", drop: "", date: "", time: "", vehicle: "" },
        response: rawText,
        price_estimate: "",
        booking_complete: false,
      };
    }

    // Override / enrich price estimate from backend logic
    const { pickup, drop, vehicle } = parsed.entities || {};
    if (pickup && drop && vehicle) {
      const calc = calcPrice(vehicle, pickup, drop);
      if (calc) {
        const known = getDistance(pickup, drop);
        const distNote = known ? `${calc.dist} km` : `~${DEFAULT_DISTANCE} km (estimated)`;
        parsed.price_estimate = `₹${calc.price.toLocaleString("en-IN")} (${distNote} × ₹${calc.rate}/km)`;
        parsed.calc_detail = { distance_km: calc.dist, rate_per_km: calc.rate, total: calc.price };
      }
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
});



app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.Body;
    const userNumber = req.body.From;

    console.log("📩 Incoming:", userMessage, "from", userNumber);

    // 🧠 Initialize session if new user
    if (!sessions[userNumber]) {
      sessions[userNumber] = {
        messages: [],
        pendingBooking: null
      };
    }

    // ➕ Add user message to history
    sessions[userNumber].messages.push({
      role: "user",
      content: userMessage
    });

  // 🔥 Handle YES / NO confirmation
  if (sessions[userNumber].pendingBooking) {
    const msg = userMessage.toLowerCase();

    if (msg === "yes") {
      const booking = sessions[userNumber].pendingBooking;

      console.log("✅ Booking confirmed:", booking);

      // 👉 (Later: save to DB here)

      sessions[userNumber] = { messages: [], pendingBooking: null };

      res.set("Content-Type", "text/xml");
      return res.send(`
        <Response>
          <Message>
  ✅ Booking Confirmed!

  Pickup: ${booking.pickup}
  Drop: ${booking.drop}
  Vehicle: ${booking.vehicle}
  Date: ${booking.date}
  Time: ${booking.time}
  Price: ${booking.price}

  Thank you for choosing YatraWheels 🚗
          </Message>
        </Response>
      `);
    }

    if (msg === "no") {
      sessions[userNumber].pendingBooking = null;

      res.set("Content-Type", "text/xml");
      return res.send(`
        <Response>
          <Message>
  No problem 👍
  What would you like to change?
          </Message>
        </Response>
      `);
    }
  }

    // 🔥 Call your existing /chat API WITH FULL HISTORY
    const aiRes = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: sessions[userNumber].messages
      })
    });

    const aiData = await aiRes.json();

    // 🔍 DEBUG LINE (ADD HERE)
    console.log("AI DATA:", aiData);
    console.log("SESSION:", sessions[userNumber]);
    
    if (aiData.booking_complete === true) {
    const booking = {
      pickup: aiData.entities.pickup,
      drop: aiData.entities.drop,
      vehicle: aiData.entities.vehicle,
      date: aiData.entities.date,
      time: aiData.entities.time,
      price: aiData.price_estimate
    };

    sessions[userNumber].pendingBooking = booking;

    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Message>
    🚗 Booking Summary:

    Pickup: ${booking.pickup}
    Drop: ${booking.drop}
    Vehicle: ${booking.vehicle}
    Date: ${booking.date}
    Time: ${booking.time}
    Price: ${booking.price}

    Reply YES to confirm or NO to modify.
          </Message>
        </Response>
      `);
    }

    const replyText = aiData.response || "Sorry, I didn't understand.";

    console.log("🤖 AI:", replyText);

    // ➕ Save AI response also
    sessions[userNumber].messages.push({
      role: "assistant",
      content: replyText
    });

    // 📤 Send reply to Twilio
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${replyText}</Message>
      </Response>
    `);

  } catch (error) {
    console.error("Webhook error:", error);

    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>Server error. Try again.</Message>
      </Response>
    `);
  }
});


// ─── VOICE ENTRY POINT ─────────────────────────────────────────
app.post("/voice", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Say voice="alice">
        Hello! Welcome to YatraWheels. Where would you like to travel?
      </Say>

      <Gather input="speech" action="/process" method="POST">
        <Say voice="alice">Please tell me your pickup and destination.</Say>
      </Gather>

      <Say>I didn’t hear anything. Please try again.</Say>
    </Response>
  `);
});

// ─── PROCESS SPEECH ────────────────────────────────────────────
app.post("/process", async (req, res) => {
  try {
    const speechText = req.body.SpeechResult;
    const callSid = req.body.CallSid; // use this as session id

    console.log("📞 User said:", speechText);

    // 🧠 Initialize session (same as WhatsApp but using CallSid)
    if (!sessions[callSid]) {
      sessions[callSid] = {
        messages: [],
        pendingBooking: null
      };
    }

    // 🔥 Handle YES / NO confirmation
    if (sessions[callSid].pendingBooking) {
      const msg = speechText.toLowerCase();

      if (msg.includes("yes")) {
        const booking = sessions[callSid].pendingBooking;

        sessions[callSid] = { messages: [], pendingBooking: null };

        res.set("Content-Type", "text/xml");
        return res.send(`
          <Response>
            <Say>Booking confirmed. Thank you!</Say>
          </Response>
        `);
      }

      if (msg.includes("no")) {
        sessions[callSid].pendingBooking = null;

        res.set("Content-Type", "text/xml");
        return res.send(`
          <Response>
            <Say>No problem. What would you like to change?</Say>
            <Redirect>/voice</Redirect>
          </Response>
        `);
      }
    }

    // ➕ Add user speech to history
    sessions[callSid].messages.push({
      role: "user",
      content: speechText
    });

    // 🤖 Call your AI
    const aiRes = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: sessions[callSid].messages
      })
    });

    const aiData = await aiRes.json();

    console.log("🤖 AI:", aiData);

    // 🔥 Handle booking summary
    if (aiData.booking_complete === true) {
      const booking = {
        pickup: aiData.entities.pickup,
        drop: aiData.entities.drop,
        vehicle: aiData.entities.vehicle,
        date: aiData.entities.date,
        time: aiData.entities.time,
        price: aiData.price_estimate
      };

      sessions[callSid].pendingBooking = booking;

      res.set("Content-Type", "text/xml");
      return res.send(`
        <Response>
          <Say>
            Booking from ${booking.pickup} to ${booking.drop}.
            Vehicle ${booking.vehicle}.
            Price ${booking.price}.
            Say yes to confirm or no to change.
          </Say>

          <Gather input="speech" action="/process" method="POST"/>
        </Response>
      `);
    }

    const replyText = aiData.response || "Sorry, I didn't understand.";

    // ➕ Save AI reply
    sessions[callSid].messages.push({
      role: "assistant",
      content: replyText
    });

    // 🔁 Respond + continue conversation
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Say>${replyText}</Say>

        <Gather input="speech" action="/process" method="POST">
          <Say>Anything else?</Say>
        </Gather>
      </Response>
    `);

  } catch (error) {
    console.error("Voice error:", error);

    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Say>Something went wrong. Please try again later.</Say>
      </Response>
    `);
  }
});

// ─── ROOT ROUTE (for browser testing) ───────────────────────────
app.get("/", (req, res) => {
  res.send("🚀 YatraWheels AI Server is running!");
});



// ─── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚗  YatraWheels AI Agent running on http://localhost:${PORT}`);
  console.log(`📂  Open index.html in your browser (or serve from this port)`);
  console.log(`✅  POST http://localhost:${PORT}/chat\n`);
});

# 🚗 YatraWheels — AI Car Rental Voice Agent Prototype

An AI-powered car rental agent that handles customer queries in **Hindi, English, or Hinglish** using Claude.

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Add your Anthropic API key
Edit `.env` and replace the placeholder:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 3. Start the backend server
```bash
node server/index.js
# or: npm start
```
Server runs on http://localhost:3000

### 4. Open the frontend
Open `index.html` directly in your browser, or navigate to:
```
http://localhost:3000
```

---

## 🗣️ Demo Conversation Flow

**Step 1** — User types in Hinglish:
```
"Mujhe Hyderabad se Bangalore jana hai kal"
```
→ AI extracts intent + pickup/drop, asks for vehicle type

**Step 2** — User replies:
```
"SUV chahiye"
```
→ AI calculates price (570km × ₹18 = ₹10,260), confirms booking

---

## 💡 Quick Test Prompts

| Prompt | Demonstrates |
|--------|--------------|
| `cab chahiye` | Short Hinglish → asks follow-up |
| `Hyderabad se Bangalore SUV kal 9am` | Full booking in one shot |
| `SUV ka kitna paisa lagega Chennai ke liye?` | Pricing inquiry |
| `I need a cab tomorrow morning 8 AM` | English intent detection |
| `Namaste! Kya services hain?` | Greeting + inquiry |

---

## 📐 Pricing Logic

| Vehicle | Rate | Min Fare |
|---------|------|----------|
| Sedan   | ₹12/km | ₹500 |
| SUV     | ₹18/km | ₹500 |
| Tempo   | ₹22/km | ₹500 |

### Hardcoded Routes
| Route | Distance |
|-------|----------|
| Hyderabad ↔ Bangalore | 570 km |
| Hyderabad ↔ Vijayawada | 275 km |
| Hyderabad ↔ Chennai | 630 km |
| Hyderabad ↔ Mumbai | 710 km |
| Hyderabad ↔ Delhi | 1500 km |
| Unknown route | ~300 km (assumed) |

---

## 🏗️ Project Structure

```
/ai-travel-prototype
  ├── index.html      ← Single page frontend
  ├── style.css       ← Dark travel-themed UI
  ├── script.js       ← Chat logic, API calls, rendering
  ├── server/
  │     └── index.js  ← Express server, Claude API, pricing
  ├── .env            ← API key (never commit this!)
  ├── package.json
  └── README.md
```

---

## 📡 API

### `POST /chat`
**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hyderabad se Bangalore SUV chahiye" }
  ]
}
```

**Response:**
```json
{
  "intent": "booking",
  "entities": {
    "pickup": "Hyderabad",
    "drop": "Bangalore",
    "date": "",
    "time": "",
    "vehicle": "SUV"
  },
  "response": "Bilkul! SUV ke liye ₹10,260 lagenge...",
  "price_estimate": "₹10,260 (570 km × ₹18/km)",
  "booking_complete": false,
  "calc_detail": { "distance_km": 570, "rate_per_km": 18, "total": 10260 }
}
```

---

## ⚙️ Tech Stack

- **Frontend**: Plain HTML + CSS + Vanilla JS
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)
- **No database, no auth, no external services** except Claude API

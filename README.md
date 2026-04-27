# YatraAI — White-Label AI Voice Agent Platform for Indian Travel Companies

## Overview

A complete full-stack SaaS platform that gives Indian car rental and travel companies an AI voice agent that:

- Answers customer calls 24/7 in Hindi, English, and Hinglish
- Automatically quotes prices, creates bookings, sends WhatsApp confirmations
- Manages fleet, tour packages, customers, and revenue analytics
- Can be white-labeled for any travel company in minutes

## Features

- 🎙️ AI Voice Agent (powered by Claude AI) — responds in Hindi/English
- 📋 End-to-end booking automation
- 🚗 Fleet management with real-time availability
- 🗺️ Tour package builder
- 👥 Customer database with VIP segmentation
- 💡 AI insights and revenue analytics
- 🏢 Multi-tenant white-label support
- 🔗 WebSocket live call simulation
- 🔐 JWT authentication

## Tech Stack

### Frontend
- Vanilla HTML/CSS/JavaScript
- WebSocket client for live agent

### Backend
- Node.js + Express.js
- SQLite (via better-sqlite3)
- WebSocket (ws)
- JWT authentication (jsonwebtoken)
- bcryptjs for password hashing

### AI & Integrations
- Anthropic Claude API (claude-sonnet-4-6)
- Ready for: Twilio (voice), Razorpay (payments), WhatsApp Business

## Project Structure

```
YatraAI/
├── yatraai-whitelabel.html    # Main frontend
├── server/
│   ├── index.js               # Express + WebSocket server
│   ├── db.js                  # SQLite database + migrations
│   ├── seed.js                # Demo data seeder
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── fleet.js
│   │   ├── customers.js
│   │   ├── tours.js
│   │   ├── calls.js
│   │   ├── dashboard.js
│   │   └── agent.js
│   └── services/
│       ├── aiAgent.js         # Claude AI integration
│       └── websocket.js       # WebSocket event handlers
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- An Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/yatraai.git
cd yatraai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Seed the database with demo data
node server/seed.js

# Start the server
node server/index.js

# Open in browser
# Go to http://localhost:3000
```

### Demo Login

| Field    | Value                    |
|----------|--------------------------|
| Email    | admin@shreeramtravels.in |
| Password | demo1234                 |

## API Endpoints

| Method     | Endpoint             | Description           |
|------------|----------------------|-----------------------|
| POST       | /api/auth/login      | Login                 |
| POST       | /api/auth/register   | Register new tenant   |
| GET        | /api/dashboard/stats | Dashboard metrics     |
| GET/POST   | /api/bookings        | List/create bookings  |
| PUT/DELETE | /api/bookings/:id    | Update/delete booking |
| GET/POST   | /api/fleet           | List/add vehicles     |
| GET/POST   | /api/tours           | List/create packages  |
| GET/POST   | /api/customers       | Customer management   |
| GET        | /api/calls           | Call session logs     |
| GET/PUT    | /api/agent-config    | AI agent settings     |
| POST       | /api/agent/chat      | Chat with AI agent    |
| GET        | /health              | Server health check   |

## Environment Variables

```env
PORT=3000
JWT_SECRET=your_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
NODE_ENV=development
```

## White-Label Setup

Each travel company gets:

1. Their own tenant in the database
2. Custom brand colors and logo
3. Their own fleet and pricing
4. Their own AI agent with custom greeting
5. Isolated data from other tenants

## Roadmap

- [ ] Twilio voice integration (real phone calls)
- [ ] WhatsApp Business API
- [ ] Razorpay payment collection
- [ ] Multi-language support (Tamil, Bengali, Gujarati)
- [ ] Mobile app (React Native)
- [ ] Cloud deployment (Railway/Render)

## Screenshots

*(Add screenshots here)*

## License

MIT

## Built With

- [Claude AI](https://www.anthropic.com) by Anthropic
- [Express.js](https://expressjs.com)
- [SQLite](https://www.sqlite.org)
"# YatraAI" 

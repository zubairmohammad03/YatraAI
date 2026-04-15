const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(tenantId) {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE tenant_id = ? AND status != ?').all(tenantId, 'maintenance');
  const tours = db.prepare('SELECT * FROM tour_packages WHERE tenant_id = ?').all(tenantId);
  const agentConfig = db.prepare('SELECT * FROM agent_config WHERE tenant_id = ?').get(tenantId);

  const vehicleList = vehicles.map(v =>
    `- ${v.type} (capacity: ${v.capacity}): ₹${v.rate_per_day}/day, ₹${v.rate_per_km}/km, Airport transfer: ₹${v.rate_airport}, Hourly: ₹${v.rate_hourly}/hr [Status: ${v.status}]`
  ).join('\n');

  const tourList = tours.map(t => {
    let inclusions = [];
    try { inclusions = JSON.parse(t.inclusions || '[]'); } catch {}
    return `- ${t.name}: ${t.duration_days} days, ₹${t.price} per person. Inclusions: ${inclusions.join(', ')}`;
  }).join('\n');

  const agentName = agentConfig?.agent_name || 'Yatra';
  const languages = agentConfig?.languages || 'Hindi,English';
  const autoConfirmBelow = agentConfig?.auto_confirm_below || 5000;

  return `You are ${agentName}, an AI travel assistant for ${tenant?.name || 'a travel company'}.

You help customers plan and book travel in India. You speak ${languages} and switch based on customer preference.

## Available Fleet:
${vehicleList || 'No vehicles available'}

## Tour Packages:
${tourList || 'No tour packages available'}

## FAQs:
- Fuel: Included in package rates, extra fuel charges for Himalayan routes may apply
- Driver: Experienced drivers, night halts included for long trips
- Cancellation: Free cancellation up to 48 hours before departure
- Payment: Advance booking requires 25% deposit
- GST: 5% GST applicable on all packages

## Booking Rules:
- Auto-confirm bookings below ₹${autoConfirmBelow}
- For bookings above ₹${autoConfirmBelow}, collect customer details and flag for manual confirmation
- Always extract: destination, vehicle type, travel dates, number of passengers, budget

## Response Format:
Always respond conversationally. At the end of your reply, include a JSON block like this:
<intent>
{
  "destination": "city or route",
  "vehicle": "vehicle type or null",
  "dates": "travel dates or null",
  "pax": number_of_passengers_or_null,
  "budget": estimated_budget_or_null,
  "intent_type": "booking|inquiry|price_check|tour_info",
  "should_auto_book": true_or_false,
  "suggested_price": price_or_null
}
</intent>`;
}

async function chatWithAgent({ message, session_id, conversation_history, tenant_id }) {
  const systemPrompt = buildSystemPrompt(tenant_id);

  const messages = [
    ...conversation_history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const fullReply = response.content[0].text;

  // Extract intent JSON from response
  let intent = null;
  let reply = fullReply;
  const intentMatch = fullReply.match(/<intent>([\s\S]*?)<\/intent>/);

  if (intentMatch) {
    try {
      intent = JSON.parse(intentMatch[1].trim());
      reply = fullReply.replace(/<intent>[\s\S]*?<\/intent>/, '').trim();
    } catch {
      // keep intent null if parse fails
    }
  }

  const shouldAutoBook = intent?.should_auto_book || false;
  const suggestedPrice = intent?.suggested_price || null;

  return {
    reply,
    intent,
    should_auto_book: shouldAutoBook,
    suggested_price: suggestedPrice,
    session_id,
    usage: response.usage,
  };
}

module.exports = { chatWithAgent, buildSystemPrompt };

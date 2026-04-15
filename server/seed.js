require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  console.log('Seeding database...');

  // Clear existing data in order
  db.exec(`
    DELETE FROM agent_config;
    DELETE FROM call_sessions;
    DELETE FROM tour_packages;
    DELETE FROM bookings;
    DELETE FROM customers;
    DELETE FROM vehicles;
    DELETE FROM users;
    DELETE FROM tenants;
  `);

  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = db.prepare(`
    INSERT INTO tenants (name, short_name, brand_color, phone, whatsapp, plan)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('Shree Ram Travels', 'shreeramtravels', '#FF6B00', '+91-9876543210', '+91-9876543210', 'pro');

  const tenantId = tenant.lastInsertRowid;
  console.log(`Tenant created: Shree Ram Travels (id=${tenantId})`);

  // ── Admin User ───────────────────────────────────────────────────────────────
  const passwordHash = bcrypt.hashSync('demo1234', 10);
  db.prepare(`
    INSERT INTO users (tenant_id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(tenantId, 'Admin', 'admin@shreeramtravels.in', passwordHash, 'admin');
  console.log('User created: admin@shreeramtravels.in / demo1234');

  // ── Vehicles ─────────────────────────────────────────────────────────────────
  const vehicles = [
    { type: 'Innova Crysta',     registration: 'UK07AB1234', capacity: 7, status: 'available', rate_per_day: 4500, rate_per_km: 14, rate_airport: 2500, rate_hourly: 350 },
    { type: 'Ertiga',            registration: 'UK07CD5678', capacity: 6, status: 'available', rate_per_day: 3200, rate_per_km: 11, rate_airport: 1800, rate_hourly: 250 },
    { type: 'Fortuner',          registration: 'UK07EF9012', capacity: 7, status: 'on_trip',   rate_per_day: 7000, rate_per_km: 20, rate_airport: 4000, rate_hourly: 550 },
    { type: 'Tempo Traveller',   registration: 'UK07GH3456', capacity: 14, status: 'available', rate_per_day: 8500, rate_per_km: 22, rate_airport: 5000, rate_hourly: 700 },
    { type: 'Swift Dzire',       registration: 'UK07IJ7890', capacity: 4, status: 'maintenance', rate_per_day: 2200, rate_per_km: 9,  rate_airport: 1400, rate_hourly: 180 },
  ];

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (tenant_id, type, registration, capacity, status, rate_per_day, rate_per_km, rate_airport, rate_hourly)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const vehicleIds = [];
  for (const v of vehicles) {
    const r = insertVehicle.run(tenantId, v.type, v.registration, v.capacity, v.status, v.rate_per_day, v.rate_per_km, v.rate_airport, v.rate_hourly);
    vehicleIds.push(r.lastInsertRowid);
  }
  console.log(`${vehicleIds.length} vehicles created.`);

  // ── Tour Packages ────────────────────────────────────────────────────────────
  const tours = [
    {
      name: 'Char Dham Yatra',
      description: 'Sacred pilgrimage covering Yamunotri, Gangotri, Kedarnath, and Badrinath.',
      duration_days: 12,
      price: 28500,
      inclusions: JSON.stringify(['AC Vehicle', 'Accommodation', 'Breakfast & Dinner', 'Driver Allowance', 'Toll & Parking']),
    },
    {
      name: 'Rajasthan Circuit',
      description: 'Explore the royal forts and palaces of Jaipur, Jodhpur, Jaisalmer, and Udaipur.',
      duration_days: 8,
      price: 22000,
      inclusions: JSON.stringify(['AC Vehicle', 'Hotel Stay', 'Breakfast', 'Sightseeing', 'Toll & Parking']),
    },
    {
      name: 'Himalayan Adventure Tour',
      description: 'Scenic drive through Shimla, Manali, Rohtang Pass, and Spiti Valley.',
      duration_days: 10,
      price: 32000,
      inclusions: JSON.stringify(['SUV Vehicle', 'Accommodation', 'All Meals', 'Adventure Activities', 'Driver Allowance']),
    },
  ];

  const insertTour = db.prepare(`
    INSERT INTO tour_packages (tenant_id, name, description, duration_days, price, inclusions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const t of tours) {
    insertTour.run(tenantId, t.name, t.description, t.duration_days, t.price, t.inclusions);
  }
  console.log(`${tours.length} tour packages created.`);

  // ── Customers ────────────────────────────────────────────────────────────────
  const customers = [
    { name: 'Ramesh Gupta',   phone: '+91-9811001100', city: 'Delhi',     total_trips: 5, total_spend: 42000 },
    { name: 'Priya Sharma',   phone: '+91-9922002200', city: 'Mumbai',    total_trips: 3, total_spend: 18500 },
    { name: 'Anil Verma',     phone: '+91-9933003300', city: 'Lucknow',   total_trips: 7, total_spend: 61000 },
    { name: 'Sunita Rawat',   phone: '+91-9944004400', city: 'Dehradun',  total_trips: 2, total_spend: 9800  },
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (tenant_id, name, phone, city, total_trips, total_spend)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const c of customers) {
    insertCustomer.run(tenantId, c.name, c.phone, c.city, c.total_trips, c.total_spend);
  }
  console.log(`${customers.length} customers created.`);

  // ── Bookings ─────────────────────────────────────────────────────────────────
  const bookings = [
    {
      booking_ref: 'SRT-2024-001',
      customer_name: 'Ramesh Gupta',
      customer_phone: '+91-9811001100',
      pickup: 'Delhi',
      dropoff: 'Haridwar',
      vehicle_id: vehicleIds[0],
      start_date: '2024-04-10',
      end_date: '2024-04-12',
      amount: 9000,
      status: 'completed',
      source: 'phone',
    },
    {
      booking_ref: 'SRT-2024-002',
      customer_name: 'Priya Sharma',
      customer_phone: '+91-9922002200',
      pickup: 'Mumbai Airport',
      dropoff: 'Pune',
      vehicle_id: vehicleIds[1],
      start_date: '2024-04-15',
      end_date: '2024-04-15',
      amount: 3200,
      status: 'confirmed',
      source: 'whatsapp',
    },
    {
      booking_ref: 'SRT-2024-003',
      customer_name: 'Anil Verma',
      customer_phone: '+91-9933003300',
      pickup: 'Lucknow',
      dropoff: 'Varanasi',
      vehicle_id: vehicleIds[2],
      start_date: '2024-04-20',
      end_date: '2024-04-22',
      amount: 14000,
      status: 'pending',
      source: 'ai_agent',
    },
    {
      booking_ref: 'SRT-2024-004',
      customer_name: 'Sunita Rawat',
      customer_phone: '+91-9944004400',
      pickup: 'Dehradun',
      dropoff: 'Mussoorie',
      vehicle_id: vehicleIds[4],
      start_date: '2024-04-25',
      end_date: '2024-04-25',
      amount: 2200,
      status: 'cancelled',
      source: 'manual',
    },
  ];

  const insertBooking = db.prepare(`
    INSERT INTO bookings (tenant_id, booking_ref, customer_name, customer_phone, pickup, dropoff, vehicle_id, start_date, end_date, amount, status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of bookings) {
    insertBooking.run(tenantId, b.booking_ref, b.customer_name, b.customer_phone, b.pickup, b.dropoff, b.vehicle_id, b.start_date, b.end_date, b.amount, b.status, b.source);
  }
  console.log(`${bookings.length} bookings created.`);

  // ── Agent Config ──────────────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO agent_config (tenant_id, agent_name, voice, languages, greeting, auto_confirm_below)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    tenantId,
    'Yatra',
    'female',
    'Hindi,English',
    'Namaste! Main Yatra hoon, Shree Ram Travels ki AI assistant. Aaj aapki yatra ki kya planning hai?',
    5000
  );
  console.log('Agent config created.');

  // ── Sample Call Sessions ─────────────────────────────────────────────────────
  const calls = [
    {
      caller_number: '+91-9811001100',
      transcript: 'Customer: Delhi se Haridwar ke liye car chahiye. Agent: Kab jaana hai? Customer: 10 April ko. Agent: 2 log hai? Customer: Haan. Agent: Innova Crysta available hai, 4500 per day.',
      extracted_intent: JSON.stringify({ destination: 'Haridwar', vehicle: 'Innova Crysta', dates: '2024-04-10', pax: 2, budget: null }),
      outcome: 'booked',
      duration_secs: 125,
    },
    {
      caller_number: '+91-9977007700',
      transcript: 'Customer: Char Dham yatra ki booking karni hai. Agent: Kab se start karna chahte hain? Customer: May mein. Agent: 12 din ka package hai 28500 mein.',
      extracted_intent: JSON.stringify({ destination: 'Char Dham', vehicle: null, dates: 'May 2024', pax: null, budget: 30000 }),
      outcome: 'inquiry',
      duration_secs: 98,
    },
  ];

  const insertCall = db.prepare(`
    INSERT INTO call_sessions (tenant_id, caller_number, transcript, extracted_intent, outcome, duration_secs)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const c of calls) {
    insertCall.run(tenantId, c.caller_number, c.transcript, c.extracted_intent, c.outcome, c.duration_secs);
  }
  console.log(`${calls.length} call sessions created.`);

  console.log('\nSeed completed successfully!');
  console.log('Login: admin@shreeramtravels.in / demo1234');
}

seed();

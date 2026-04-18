/* ── Config ─────────────────────────────────────────────────────────────────── */
const API_URL = "http://localhost:3000/chat";

/* ── State ──────────────────────────────────────────────────────────────────── */
let conversationHistory = [];
let isLoading = false;

/* ── DOM refs ────────────────────────────────────────────────────────────────── */
const chatWindow  = document.getElementById("chat-window");
const userInput   = document.getElementById("user-input");
const sendBtn     = document.getElementById("send-btn");
const welcomeDiv  = document.getElementById("welcome");

/* ── Quick prompt buttons ────────────────────────────────────────────────────── */
document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (isLoading) return;
    userInput.value = btn.dataset.msg;
    sendMessage();
  });
});

/* ── Auto-resize textarea ────────────────────────────────────────────────────── */
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

/* ── Enter to send (Shift+Enter = newline) ───────────────────────────────────── */
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!isLoading) sendMessage();
  }
});

sendBtn.addEventListener("click", () => { if (!isLoading) sendMessage(); });

/* ── Send message ────────────────────────────────────────────────────────────── */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // Hide welcome screen
  if (welcomeDiv) welcomeDiv.style.display = "none";

  // Append user bubble
  appendUserMsg(text);
  conversationHistory.push({ role: "user", content: text });

  userInput.value = "";
  userInput.style.height = "auto";
  setLoading(true);

  // Show typing indicator
  const typingId = showTyping();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    removeTyping(typingId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      appendErrorMsg(err.error || `HTTP ${res.status}`);
      return;
    }

    const data = await res.json();

    // Add AI response to history
    conversationHistory.push({
      role: "assistant",
      content: JSON.stringify(data),
    });

    appendAIMsg(data);

  } catch (err) {
    removeTyping(typingId);
    appendErrorMsg("Could not connect to server. Make sure `node server/index.js` is running on port 3000.");
  } finally {
    setLoading(false);
  }
}

/* ── Render user message ─────────────────────────────────────────────────────── */
function appendUserMsg(text) {
  const msg = document.createElement("div");
  msg.className = "msg user";
  msg.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-content">
      <div class="bubble">${escapeHtml(text)}</div>
    </div>
  `;
  chatWindow.appendChild(msg);
  scrollBottom();
}

/* ── Render AI message ───────────────────────────────────────────────────────── */
function appendAIMsg(data) {
  const intent     = data.intent || "inquiry";
  const response   = data.response || "...";
  const entities   = data.entities || {};
  const price      = data.price_estimate || "";
  const complete   = data.booking_complete || false;
  const calcDetail = data.calc_detail;

  const jsonId = "json-" + Date.now();

  // Build clean JSON for display (without raw calc_detail noise)
  const displayJson = {
    intent,
    entities,
    price_estimate: price,
    booking_complete: complete,
  };
  if (calcDetail) displayJson.calc_detail = calcDetail;

  let extraHtml = "";

  if (price) {
    extraHtml += `
      <div class="price-chip">
        <span class="price-chip-icon">💰</span>
        ${escapeHtml(price)}
      </div>`;
  }

  if (complete) {
    extraHtml += `
      <div class="booking-banner">
        ✅ Booking confirmed! We'll connect you with a driver shortly.
      </div>`;
  }

  const msg = document.createElement("div");
  msg.className = "msg ai";
  msg.innerHTML = `
    <div class="msg-avatar">🚗</div>
    <div class="msg-content">
      <span class="intent-badge intent-${escapeHtml(intent)}">${escapeHtml(intent)}</span>
      <div class="bubble">${formatResponse(response)}</div>
      ${extraHtml}
      <div class="json-card">
        <div class="json-header" onclick="toggleJson('${jsonId}')">
          <span class="json-title">
            <span class="json-title-dot"></span>
            Extracted Data
          </span>
          <span class="json-toggle" id="toggle-${jsonId}">▼</span>
        </div>
        <div class="json-body" id="${jsonId}">
          <pre>${syntaxHighlight(displayJson)}</pre>
        </div>
      </div>
    </div>
  `;
  chatWindow.appendChild(msg);
  scrollBottom();
}

/* ── Typing indicator ────────────────────────────────────────────────────────── */
function showTyping() {
  const id = "typing-" + Date.now();
  const el = document.createElement("div");
  el.className = "msg ai";
  el.id = id;
  el.innerHTML = `
    <div class="msg-avatar">🚗</div>
    <div class="msg-content">
      <div class="bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  chatWindow.appendChild(el);
  scrollBottom();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/* ── Error message ───────────────────────────────────────────────────────────── */
function appendErrorMsg(text) {
  const msg = document.createElement("div");
  msg.className = "msg ai";
  msg.innerHTML = `
    <div class="msg-avatar">⚠️</div>
    <div class="msg-content">
      <div class="error-msg">${escapeHtml(text)}</div>
    </div>
  `;
  chatWindow.appendChild(msg);
  scrollBottom();
}

/* ── Toggle JSON panel ───────────────────────────────────────────────────────── */
function toggleJson(id) {
  const body   = document.getElementById(id);
  const toggle = document.getElementById("toggle-" + id);
  const open   = body.classList.toggle("open");
  if (toggle) toggle.classList.toggle("open", open);
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  userInput.disabled = state;
}

function scrollBottom() {
  requestAnimationFrame(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatResponse(text) {
  // Convert newlines to <br>, escape HTML
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function syntaxHighlight(obj) {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    match => {
      let cls = "json-num";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "json-key" : "json-str";
      } else if (/true|false/.test(match)) {
        cls = "json-bool";
      } else if (/null/.test(match)) {
        cls = "json-null";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

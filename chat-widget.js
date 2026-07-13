'use strict';
// Chat widget — talks to the 'chat-assistant' Supabase Edge Function.
// Requires CHAT_FUNCTION_URL to be set in supabase-config.js.

(function () {
  const SESSION_KEY = 'tjs_chat_session_id';
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  let history = [];
  let sending = false;

  const toggleBtn = document.getElementById('chatToggleBtn');
  const panel = document.getElementById('chatPanel');
  const messagesEl = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const closeBtn = document.getElementById('chatCloseBtn');

  if (!toggleBtn || !panel) return;

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
  });
  closeBtn?.addEventListener('click', () => panel.classList.remove('open'));

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTypingIndicator() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble assistant typing';
    bubble.id = 'typingIndicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function removeTypingIndicator() {
    document.getElementById('typingIndicator')?.remove();
  }

  // greet on first open
  let greeted = false;
  toggleBtn.addEventListener('click', () => {
    if (!greeted) {
      addMessage('assistant', "Hi! I'm the TOPJOBSEEKERS assistant. Ask me about open jobs, the application process, fees, or your CV status.");
      greeted = true;
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;

    addMessage('user', text);
    input.value = '';
    sending = true;
    addTypingIndicator();

    try {
      const res = await fetch(CHAT_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, session_id: sessionId }),
      });
      const data = await res.json();
      removeTypingIndicator();
      addMessage('assistant', data.reply || "Sorry, I didn't catch that — try again?");
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: data.reply || '' });
      if (history.length > 12) history = history.slice(-12); // keep context small
    } catch (err) {
      removeTypingIndicator();
      addMessage('assistant', "Sorry, something went wrong. Please WhatsApp us at +254 748801685.");
    } finally {
      sending = false;
    }
  });
})();

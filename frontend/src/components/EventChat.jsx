import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, Minus } from 'lucide-react';
import './EventChat.css';

const questions = {
  landing: ['Which events can I register for?', 'How do I find my pass?'],
  'event-details': ['When and where is this event?', 'What ticket options are available?'],
  pass: ['How do I use my QR pass?', 'What should I bring to check-in?'],
  portal: ['Where can I find my pass?', 'How does event check-in work?'],
  login: ['How do I access my passes?', 'Where do staff sign in?'],
  dashboard: ['How do attendees register?', 'How does QR check-in work?'],
  scanner: ['How do I scan a pass?', 'What if a pass has already been scanned?'],
};
function quickReply(text, page, registration) {
  const question = text.toLowerCase().replace(/[?!.]+$/, '').trim();
  switch (question) {
    case 'how do i find my pass':
    case 'where can i find my pass':
    case 'how do i access my passes':
      return 'Open My Passes and use the email you registered with to find your event pass.';
    case 'how do i use my qr pass':
    case 'how does qr check-in work':
    case 'how does event check-in work':
      return 'Open your digital pass and show its QR code to the check-in staff at the entrance.';
    case 'my payment is pending. what should i do':
      return 'Check the payment status on your registration page. Wait for verification before making another payment.';
    case 'how much is due':
      if (page === 'register' && registration?.step === 'review' && registration.amount) {
        return 'The amount shown for your selected pass is ' + registration.amount + '.';
      }
  }
}

function suggestions(page, registration) {
  if (page !== 'register') return questions[page] || questions.landing;
  if (registration?.payment === 'pending verification') return ['My payment is pending. What should I do?', 'When will I get my pass?'];
  if (registration?.payment === 'notice visible') return ['What should I check after a payment error?', 'How can I check my registration?'];
  if (registration?.step === 'attendee') return ['What details do I need?', 'Why can’t I continue?'];
  if (registration?.step === 'review') return ['How much is due?', 'What happens after checkout?'];
  return ['Which pass should I choose?', 'Where can I review the fee?'];
}

export function EventChat({ page, eventId, registration }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const launcher = useRef(null);
  const input = useRef(null);
  const log = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, open, error, page, registration]);
  function close() {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  }

  async function send(value) {
    const text = value.trim();
    if (!text || request.current) return;
    const history = [...messages, { role: 'user', text }];
    const answer = quickReply(text, page, registration);
    if (answer) {
      setMessages([...history, { role: 'assistant', text: answer }]);
      setDraft('');
      setError('');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 32000);
    setMessages([...history, { role: 'assistant', text: '' }]);
    setDraft('');
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: history.slice(-9).map(m => ({ ...m, text: m.text.slice(0, 6000) })), context: { page, eventId, ...registration } }),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Chat is temporarily unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', reply = '', complete = false;
      while (!complete) {
        const { value: chunk, done } = await reader.read();
        if (done) throw new Error('Connection interrupted. Please try again.');
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const part = JSON.parse(line);
          if (part.error) throw new Error(part.error);
          if (part.done) complete = true;
          if (part.text) {
            reply += part.text;
            setMessages([...history, { role: 'assistant', text: reply }]);
          }
        }
      }
    } catch (err) {
      setMessages(messages);
      setDraft(text);
      setError(err.name === 'AbortError' ? 'The request timed out. Please try again.' : err.message);
    } finally {
      clearTimeout(timer);
      request.current = null;
      setPending(false);
    }
  }
  return <div className="event-chat">
    {open ? <section className="event-chat-panel" role="dialog" aria-label="Ask Eventra" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <header><MessageCircle size={20}/><div><strong>Ask Eventra</strong><small>AI event assistant</small></div><button aria-label="Minimize chat" onClick={close}><Minus size={18}/></button></header>
      <div className="event-chat-scroll" ref={log}>
        <div role="log" aria-label="Conversation" aria-live="polite" aria-busy={pending}>
          {messages.map((m,i) => <p className={'event-chat-' + m.role} key={i}><span className="event-chat-sr">{m.role === 'user' ? 'You' : 'Ask Eventra'}: </span>{m.text || 'Thinking…'}</p>)}
        </div>
        {error && <p role="alert">{error}</p>}
        <strong className="event-chat-prompt">What would you like to ask?</strong>
        <div className="event-chat-options">{suggestions(page, registration).map(q => <button key={q} disabled={pending} onClick={() => send(q)}>{q}</button>)}</div>
      </div>
      <form onSubmit={e => { e.preventDefault(); send(draft); }}>
        <input ref={input} aria-label="Your question" placeholder="Type your question…" value={draft} readOnly={pending} maxLength={1200} onChange={e => setDraft(e.target.value)}/>
        <button aria-label="Send question" disabled={pending || !draft.trim()}><ArrowUp size={18}/></button>
      </form>
    </section> : <button className="event-chat-launcher" ref={launcher} aria-haspopup="dialog" onClick={() => setOpen(true)}><MessageCircle size={18}/> Ask Eventra</button>}
  </div>;
}

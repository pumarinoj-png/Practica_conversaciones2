"use client";

import { useEffect, useRef, useState } from "react";

const EMPTY = { userName: "", collabName: "", challenge: "", difficulties: "" };

// 30% de las conversaciones parten con un colaborador/a más desafiante
function rollDisposition() {
  return Math.random() < 0.3 ? "desafiante" : "receptiva";
}

function scoreClass(n) {
  if (n >= 5.5) return "good";
  if (n >= 4.0) return "mid";
  return "low";
}

export default function Home() {
  const [stage, setStage] = useState("setup"); // setup | chat | feedback
  const [ctx, setCtx] = useState(EMPTY);
  const [messages, setMessages] = useState([]);
  const [disposition, setDisposition] = useState("receptiva");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  const ready =
    ctx.userName.trim() && ctx.collabName.trim() && ctx.challenge.trim() && ctx.difficulties.trim();

  function startChat(e) {
    e.preventDefault();
    if (!ready) return;
    setMessages([]);
    setFeedback(null);
    setError("");
    setDisposition(rollDisposition());
    setStage("chat");
  }

  function restartConversation() {
    setMessages([]);
    setFeedback(null);
    setError("");
    setInput("");
    setDisposition(rollDisposition());
    setStage("chat");
  }

  function newConversation() {
    setCtx(EMPTY);
    setMessages([]);
    setFeedback(null);
    setError("");
    setInput("");
    setStage("setup");
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctx, disposition, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError("No pude obtener respuesta. Intenta enviar tu mensaje de nuevo.");
      setMessages(next.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  async function askFeedback() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ctx, messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setFeedback(data.feedback);
      setSaved(data.saved);
      setStage("feedback");
    } catch (e) {
      setError(e.message || "No se pudo generar el feedback.");
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  /* ---------- Pantalla 1: datos iniciales ---------- */
  if (stage === "setup") {
    return (
      <main className="shell">
        <form className="panel" onSubmit={startChat}>
          <h1>Práctica de conversaciones</h1>
          <p className="lead">
            Vas a conversar con un colaborador o colaboradora simulado/a para practicar cómo
            entregarle un desafío. Cuéntanos primero el contexto.
          </p>

          <div className="field">
            <label htmlFor="userName">Tu nombre y apellido</label>
            <input
              id="userName"
              value={ctx.userName}
              onChange={(e) => setCtx({ ...ctx, userName: e.target.value })}
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="collabName">Nombre de la persona con la que conversarás</label>
            <input
              id="collabName"
              value={ctx.collabName}
              onChange={(e) => setCtx({ ...ctx, collabName: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="challenge">¿Cuál es el desafío que quieres entregarle?</label>
            <textarea
              id="challenge"
              rows={3}
              value={ctx.challenge}
              onChange={(e) => setCtx({ ...ctx, challenge: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="difficulties">
              ¿Qué dificultades podrías llegar a tener en la conversación?
            </label>
            <textarea
              id="difficulties"
              rows={3}
              value={ctx.difficulties}
              onChange={(e) => setCtx({ ...ctx, difficulties: e.target.value })}
            />
          </div>

          <button className="btn" type="submit" disabled={!ready}>
            Comenzar conversación
          </button>
        </form>
      </main>
    );
  }

  /* ---------- Pantalla 3: feedback ---------- */
  if (stage === "feedback" && feedback) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Tu feedback</h1>
          <p className="lead">
            Conversación de {ctx.userName} con {ctx.collabName}.
          </p>

          <div className="score-hero">
            <span className={`num ${scoreClass(feedback.overall)}`}>
              {feedback.overall.toFixed(1)}
            </span>
            <span className="lab">nota general</span>
          </div>

          {feedback.steps.map((s) => (
            <div className="step" key={s.key}>
              <span className="name">{s.label}</span>
              <span className={`note ${scoreClass(s.score)}`}>{s.score.toFixed(1)}</span>
              <span className="comment">{s.comment}</span>
            </div>
          ))}

          <h2 style={{ marginTop: 24 }}>Dos tips para la próxima vez</h2>
          <ul className="tips">
            {feedback.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>

          {!saved && (
            <p className="notice">
              Nota: este feedback no pudo guardarse para el administrador.
            </p>
          )}

          <div className="actions">
            <button className="btn" onClick={restartConversation}>
              Reiniciar esta conversación
            </button>
            <button className="btn ghost" onClick={newConversation}>
              Hacer una nueva conversación
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ---------- Pantalla 2: chat ---------- */
  return (
    <main className="shell">
      <section className="chat">
        <header className="chat-head">
          <div className="who">{ctx.collabName}</div>
          <div className="sub">Conversas como {ctx.userName}</div>
          <div className="challenge">Desafío: {ctx.challenge}</div>
          <div className="toolbar">
            <button className="btn ghost small" onClick={restartConversation} disabled={loading}>
              Reiniciar esta conversación
            </button>
            <button className="btn ghost small" onClick={newConversation} disabled={loading}>
              Hacer una nueva conversación
            </button>
            <button
              className="btn small"
              onClick={askFeedback}
              disabled={loading || !messages.length}
            >
              Pedir feedback
            </button>
          </div>
        </header>

        <div className="log" ref={logRef} aria-live="polite">
          {messages.length === 0 && (
            <div className="empty">
              Empieza tú: saluda a {ctx.collabName} y entrégale el desafío.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "me" : "them"}`}>
              {m.content}
            </div>
          ))}
          {loading && <div className="bubble them typing">Escribiendo…</div>}
        </div>

        {error && (
          <p className="error" style={{ padding: "0 18px" }}>
            {error}
          </p>
        )}

        <div className="composer">
          <textarea
            rows={2}
            placeholder="Escribe tu mensaje…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            aria-label="Tu mensaje"
          />
          <button className="btn" onClick={send} disabled={loading || !input.trim()}>
            Enviar
          </button>
        </div>
      </section>
    </main>
  );
}

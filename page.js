"use client";

import { useEffect, useState } from "react";

function scoreClass(n) {
  if (n >= 5.5) return "good";
  if (n >= 4.0) return "mid";
  return "low";
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function Admin() {
  const [pass, setPass] = useState("");
  const [items, setItems] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(password) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/feedbacks", {
        headers: { "x-admin-password": password },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setItems(data.items);
      setConfigured(data.configured);
      sessionStorage.setItem("admin-pass", password);
    } catch (e) {
      setItems(null);
      sessionStorage.removeItem("admin-pass");
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-pass");
    if (saved) {
      setPass(saved);
      load(saved);
    }
  }, []);

  if (!items) {
    return (
      <main className="shell">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            load(pass);
          }}
        >
          <h1>Administración</h1>
          <p className="lead">Ingresa la contraseña para ver las conversaciones realizadas.</p>
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <input
              id="pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={!pass || loading}>
            Entrar
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (i) =>
      !q ||
      i.userName.toLowerCase().includes(q) ||
      i.challenge.toLowerCase().includes(q)
  );

  return (
    <main className="shell">
      <section className="panel admin">
        <div className="row-top">
          <div>
            <h1>Conversaciones realizadas</h1>
            <p className="lead" style={{ margin: 0 }}>
              {items.length} en total{q ? ` · ${shown.length} coinciden` : ""}
            </p>
          </div>
          <div className="actions" style={{ marginTop: 0 }}>
            <input
              className="search"
              placeholder="Buscar por nombre o desafío"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar"
            />
            <button className="btn ghost small" onClick={() => load(pass)} disabled={loading}>
              Actualizar
            </button>
          </div>
        </div>

        {!configured && (
          <p className="error">
            La base de datos no está configurada: no se está guardando nada todavía.
          </p>
        )}

        {shown.length === 0 && <p className="lead" style={{ marginTop: 24 }}>No hay resultados.</p>}

        {shown.map((i) => (
          <details className="item" key={i.id}>
            <summary>
              <strong>{i.userName}</strong>
              <span className="meta">{fmtDate(i.createdAt)}</span>
              <span className={`overall ${scoreClass(i.feedback.overall)}`}>
                {i.feedback.overall.toFixed(1)}
              </span>
            </summary>
            <div className="body">
              <h3>Desafío a transmitir</h3>
              <p>{i.challenge}</p>

              <h3>Feedback entregado</h3>
              {i.feedback.steps.map((s) => (
                <div className="step" key={s.key}>
                  <span className="name">{s.label}</span>
                  <span className={`note ${scoreClass(s.score)}`}>{s.score.toFixed(1)}</span>
                  <span className="comment">{s.comment}</span>
                </div>
              ))}

              <h3>Tips</h3>
              <ul className="tips">
                {i.feedback.tips.map((t, k) => (
                  <li key={k}>{t}</li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}

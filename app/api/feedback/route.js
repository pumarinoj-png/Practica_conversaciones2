import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { STEPS, buildFeedbackPrompt } from "../../../lib/prompts";
import { saveFeedback } from "../../../lib/store";

export const maxDuration = 60;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

function clean(s, max = 1500) {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1.0;
  return Math.round(Math.min(7, Math.max(1, v)) * 10) / 10;
}

function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Sin JSON");
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req) {
  try {
    const { ctx, messages } = await req.json();
    const userName = clean(ctx?.userName, 80);
    const collabName = clean(ctx?.collabName, 80);
    const challenge = clean(ctx?.challenge);
    if (!userName || !collabName || !challenge) {
      return NextResponse.json({ error: "Faltan datos del contexto." }, { status: 400 });
    }

    const msgs = (Array.isArray(messages) ? messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && clean(m.content, 2000))
      .slice(-60);
    if (!msgs.some((m) => m.role === "user")) {
      return NextResponse.json(
        { error: "Primero conversa un poco para poder evaluar." },
        { status: 400 }
      );
    }

    const transcript = msgs
      .map((m) => `${m.role === "user" ? userName : collabName}: ${clean(m.content, 2000)}`)
      .join("\n");

    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: buildFeedbackPrompt({ userName, collabName, challenge, transcript }),
        },
      ],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const raw = parseJson(text);

    const steps = STEPS.map((s) => ({
      key: s.key,
      label: s.label,
      score: clampScore(raw[s.key]?.nota),
      comment: clean(raw[s.key]?.comentario, 600),
    }));
    const overall =
      Math.round((steps.reduce((a, s) => a + s.score, 0) / steps.length) * 10) / 10;
    const tips = (Array.isArray(raw.tips) ? raw.tips : [])
      .map((t) => clean(t, 500))
      .filter(Boolean)
      .slice(0, 2);

    const feedback = { steps, overall, tips };

    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      userName,
      challenge,
      feedback,
    };

    let saved = false;
    try {
      saved = await saveFeedback(record);
    } catch (e) {
      console.error("Error guardando feedback", e);
    }

    return NextResponse.json({ feedback, saved });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo generar el feedback." }, { status: 500 });
  }
}

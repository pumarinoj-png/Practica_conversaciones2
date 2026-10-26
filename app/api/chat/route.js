import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildCollaboratorSystem } from "../../../lib/prompts";

export const maxDuration = 30;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

function clean(s, max = 1500) {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

export async function POST(req) {
  try {
    const { ctx, disposition, messages } = await req.json();
    const userName = clean(ctx?.userName, 80);
    const collabName = clean(ctx?.collabName, 80);
    const challenge = clean(ctx?.challenge);
    const difficulties = clean(ctx?.difficulties);
    if (!userName || !collabName || !challenge) {
      return NextResponse.json({ error: "Faltan datos del contexto." }, { status: 400 });
    }

    const msgs = (Array.isArray(messages) ? messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && clean(m.content, 2000))
      .map((m) => ({ role: m.role, content: clean(m.content, 2000) }))
      .slice(-40);
    if (!msgs.length || msgs[0].role !== "user" || msgs[msgs.length - 1].role !== "user") {
      return NextResponse.json({ error: "Mensajes inválidos." }, { status: 400 });
    }

    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: buildCollaboratorSystem({
        userName,
        collabName,
        challenge,
        difficulties: difficulties || "No indicó ninguna en particular.",
        disposition: disposition === "desafiante" ? "desafiante" : "receptiva",
      }),
      messages: msgs,
    });

    const reply = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ reply });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "No se pudo obtener la respuesta." }, { status: 500 });
  }
}

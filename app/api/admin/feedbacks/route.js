import { NextResponse } from "next/server";
import { listFeedbacks, storeConfigured } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const pass = process.env.ADMIN_PASSWORD;
  const given = req.headers.get("x-admin-password");
  if (!pass || !given || given !== pass) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const items = await listFeedbacks();
    return NextResponse.json({ items, configured: storeConfigured() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error leyendo los datos." }, { status: 500 });
  }
}

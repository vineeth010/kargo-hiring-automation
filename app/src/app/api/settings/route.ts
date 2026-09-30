import { NextRequest, NextResponse } from "next/server";
import { getAllScreeningThresholds, setScreeningThreshold } from "@/lib/settings";
import type { Role } from "cv-scoring-engine";

export async function GET() {
  const thresholds = await getAllScreeningThresholds();
  return NextResponse.json({ thresholds });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { role?: Role; threshold?: number };
  if (body.role !== "PM" && body.role !== "SPM") {
    return NextResponse.json({ error: "role must be 'PM' or 'SPM'" }, { status: 400 });
  }
  if (typeof body.threshold !== "number" || body.threshold < 0 || body.threshold > 100) {
    return NextResponse.json({ error: "threshold must be a number between 0 and 100" }, { status: 400 });
  }
  await setScreeningThreshold(body.role, body.threshold);
  return NextResponse.json({ ok: true });
}

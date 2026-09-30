import { NextRequest, NextResponse } from "next/server";
import { processCandidate } from "@/lib/pipeline/processCandidate";

// CV processing (extraction + a few Gemini calls) can take longer than the
// platform default; give it room. One file per request, by design — the
// upload UI loops client-side over multiple files so a slow/failed file
// never blocks or times out the whole batch.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const role = formData.get("role");
  const file = formData.get("file");

  if (role !== "PM" && role !== "SPM") {
    return NextResponse.json({ error: "role must be 'PM' or 'SPM'" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await processCandidate({
      role,
      fileBuffer: buffer,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

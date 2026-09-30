import { NextRequest, NextResponse } from "next/server";
import { getCandidateDetail } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getCandidateDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

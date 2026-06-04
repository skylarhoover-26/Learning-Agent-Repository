import { NextResponse } from "next/server";
import { generateTones } from "@/lib/lesson-ai";

export async function GET() {
  const tones = await generateTones();
  return NextResponse.json({ tones });
}

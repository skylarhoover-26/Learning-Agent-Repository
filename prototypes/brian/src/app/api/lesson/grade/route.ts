import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeMessage } from "@/lib/lesson-ai";

const Body = z.object({ message: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const json = await req.json();
  const { message } = Body.parse(json);
  const grade = await gradeMessage(message);
  return NextResponse.json(grade);
}

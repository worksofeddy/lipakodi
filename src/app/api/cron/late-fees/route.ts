import { NextResponse } from "next/server";
import { processLateFees } from "@/lib/late-fees";

export async function GET(req: Request) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processLateFees();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Late fees cron error:", error);
    return NextResponse.json(
      { error: "Failed to process late fees" },
      { status: 500 }
    );
  }
}

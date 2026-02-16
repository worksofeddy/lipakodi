import { NextRequest, NextResponse } from "next/server";
import { processRentReminders } from "@/lib/rent-reminders";

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await processRentReminders();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Rent reminders cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

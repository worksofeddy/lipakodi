import { NextResponse } from "next/server";

export async function POST() {
  // Accept all payments
  return NextResponse.json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });
}

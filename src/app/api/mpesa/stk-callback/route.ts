import { NextResponse } from "next/server";
import { reconcileStkCallback } from "@/lib/reconciliation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const callbackData = body.Body?.stkCallback;

    if (callbackData) {
      await reconcileStkCallback(callbackData);
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("STK callback error:", error);
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  }
}

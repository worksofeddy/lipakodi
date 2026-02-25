import { NextResponse } from "next/server";
import { reconcileStkCallback } from "@/lib/reconciliation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const callbackData = body.Body?.stkCallback;

    if (callbackData) {
      if (callbackData.ResultCode !== 0) {
        console.error(
          `STK callback failed: ResultCode=${callbackData.ResultCode}, ResultDesc="${callbackData.ResultDesc}", CheckoutRequestID=${callbackData.CheckoutRequestID}`
        );
      }
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

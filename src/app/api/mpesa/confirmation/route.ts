import { NextResponse } from "next/server";
import { reconcileC2BPayment } from "@/lib/reconciliation";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    await reconcileC2BPayment({
      TransID: data.TransID,
      TransAmount: data.TransAmount,
      BusinessShortCode: data.BusinessShortCode,
      BillRefNumber: data.BillRefNumber,
      MSISDN: data.MSISDN,
      FirstName: data.FirstName,
      LastName: data.LastName,
      TransTime: data.TransTime,
    });

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("M-Pesa confirmation error:", error);
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  }
}

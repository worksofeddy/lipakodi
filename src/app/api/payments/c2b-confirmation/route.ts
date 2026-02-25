import { NextResponse } from "next/server";
import { reconcileC2BPayment } from "@/lib/reconciliation";

export async function POST(request: Request) {
  let transId = "unknown";
  try {
    const data = await request.json();
    transId = data.TransID || "unknown";

    if (!data.TransID || !data.TransAmount || !data.MSISDN) {
      console.error("C2B confirmation missing required fields:", {
        TransID: data.TransID,
        TransAmount: data.TransAmount,
        MSISDN: data.MSISDN,
      });
      return NextResponse.json({
        ResultCode: 1,
        ResultDesc: "Missing required fields",
      });
    }

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
    console.error(`C2B confirmation error for TransID=${transId}:`, error);
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Success",
    });
  }
}

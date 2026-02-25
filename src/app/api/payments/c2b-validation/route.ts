import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const accountNumber = data.BillRefNumber;

    if (accountNumber) {
      const unit = await prisma.unit.findFirst({
        where: { accountNumber },
      });

      if (!unit) {
        console.error("C2B validation rejected: no unit with account number", accountNumber);
        return NextResponse.json({
          ResultCode: 1,
          ResultDesc: "Rejected: Invalid account number",
        });
      }
    }

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  } catch (error) {
    console.error("C2B validation error:", error);
    // Accept on error to avoid losing payments due to internal failures
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  }
}

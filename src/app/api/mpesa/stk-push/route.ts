import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMpesaConfig, stkPush } from "@/lib/mpesa";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId, phoneNumber, amount: requestedAmount } = await request.json();

    if (!invoiceId || !phoneNumber) {
      return NextResponse.json(
        { error: "invoiceId and phoneNumber are required" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: { include: { unit: { include: { property: true } } } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const outstanding = invoice.totalAmount - invoice.amountPaid;
    if (outstanding <= 0) {
      return NextResponse.json(
        { error: "Invoice is already fully paid" },
        { status: 400 }
      );
    }

    // Use requested amount if provided, otherwise use full outstanding
    const payAmount = requestedAmount && requestedAmount > 0
      ? Math.min(requestedAmount, outstanding)
      : outstanding;

    const mpesaConfig = await getMpesaConfig(invoice.propertyId);
    if (!mpesaConfig) {
      return NextResponse.json(
        { error: "M-Pesa is not configured for this property" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
    const accountRef =
      invoice.tenant.unit.accountNumber || invoice.invoiceNumber;

    const result = await stkPush(mpesaConfig, {
      phoneNumber,
      amount: payAmount,
      accountReference: accountRef,
      transactionDesc: `Payment for ${invoice.invoiceNumber}`,
      callbackUrl: `${baseUrl}/api/payments/stk-callback`,
    });

    if (result.ResponseCode !== "0") {
      console.error("STK Push rejected by Safaricom:", result.ResponseDescription);
      return NextResponse.json(
        { error: result.ResponseDescription || "M-Pesa request failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId: result.CheckoutRequestID,
      message: "STK Push sent. Check your phone to complete payment.",
    });
  } catch (error) {
    console.error("STK Push error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}

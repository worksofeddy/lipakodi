import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const waiveSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
});

export async function POST(
  req: Request,
  { params }: { params: { itemId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { reason } = waiveSchema.parse(body);

    // Verify the item belongs to this landlord and is a LATE_FEE
    const item = await prisma.invoiceItem.findFirst({
      where: {
        id: params.itemId,
        itemType: "LATE_FEE",
        waivedAt: null,
        invoice: {
          tenant: {
            unit: { property: { landlordId: session.user.id } },
          },
        },
      },
      include: { invoice: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Late fee not found or already waived" },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark item as waived
      await tx.invoiceItem.update({
        where: { id: params.itemId },
        data: {
          waivedAt: new Date(),
          waivedBy: session.user!.id,
          waiverReason: reason,
        },
      });

      // Decrement invoice totals
      const updatedInvoice = await tx.invoice.update({
        where: { id: item.invoiceId },
        data: {
          subtotal: { decrement: item.amount },
          totalAmount: { decrement: item.amount },
        },
      });

      // If amount paid now covers the new total, mark as PAID
      if (
        updatedInvoice.amountPaid >= updatedInvoice.totalAmount &&
        updatedInvoice.totalAmount > 0
      ) {
        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: { status: "PAID" },
        });
      }

      return updatedInvoice;
    });

    return NextResponse.json({ success: true, invoice: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

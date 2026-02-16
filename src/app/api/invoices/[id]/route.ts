import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        tenant: {
          include: {
            user: { select: { name: true, email: true } },
            unit: { include: { property: true } },
          },
        },
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findFirst({
        where: { userId: session.user.id },
      });
      if (tenant?.id !== invoice.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { tenant: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { status },
      include: { items: true },
    });

    if (status === "SENT") {
      await prisma.notification.create({
        data: {
          userId: invoice.tenant.userId,
          title: "Invoice Sent",
          message: `Invoice ${invoice.invoiceNumber} for KES ${invoice.totalAmount.toLocaleString()} is due ${invoice.dueDate.toLocaleDateString()}`,
          type: "INVOICE_SENT",
          invoiceId: invoice.id,
        },
      });
    }

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

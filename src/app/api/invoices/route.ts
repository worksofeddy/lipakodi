import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateInvoiceNumber(): string {
  const prefix = "INV";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findFirst({
        where: { userId: session.user.id },
      });
      if (!tenant) {
        return NextResponse.json({ invoices: [] });
      }
      where.tenantId = tenant.id;
    } else {
      const properties = await prisma.property.findMany({
        where: { landlordId: session.user.id },
        select: { id: true },
      });
      where.propertyId = { in: properties.map((p) => p.id) };
      if (propertyId) where.propertyId = propertyId;
    }

    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        tenant: { include: { user: { select: { name: true, email: true } } } },
        items: true,
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, propertyId, dueDate, items, notes, sendImmediately } =
      body;

    if (!tenantId || !propertyId || !dueDate || !items?.length) {
      return NextResponse.json(
        { error: "tenantId, propertyId, dueDate, and items are required" },
        { status: 400 }
      );
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, landlordId: session.user.id },
    });
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        tenantId,
        propertyId,
        dueDate: new Date(dueDate),
        status: sendImmediately ? "SENT" : "DRAFT",
        subtotal: totalAmount,
        totalAmount,
        notes,
        items: {
          create: items.map(
            (item: {
              description: string;
              quantity: number;
              unitPrice: number;
              itemType: string;
            }) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              itemType: item.itemType || "OTHER",
            })
          ),
        },
      },
      include: { items: true },
    });

    if (sendImmediately) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { userId: true },
      });
      if (tenant) {
        await prisma.notification.create({
          data: {
            userId: tenant.userId,
            title: "New Invoice",
            message: `You have a new invoice ${invoice.invoiceNumber} for KES ${totalAmount.toLocaleString()}. Due: ${new Date(dueDate).toLocaleDateString()}`,
            type: "INVOICE_SENT",
            invoiceId: invoice.id,
          },
        });
      }
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build filter for invoice items of type LATE_FEE belonging to this landlord's properties
  const where: Record<string, unknown> = {
    itemType: "LATE_FEE",
    invoice: {
      tenant: {
        unit: {
          property: {
            landlordId: session.user.id,
            ...(propertyId && { id: propertyId }),
          },
        },
      },
    },
  };

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
    };
  }

  const items = await prisma.invoiceItem.findMany({
    where,
    include: {
      invoice: {
        include: {
          tenant: {
            include: {
              user: { select: { name: true } },
              unit: {
                include: {
                  property: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate stats
  const totalCount = items.length;
  const totalRevenue = items
    .filter((i) => !i.waivedAt)
    .reduce((sum, i) => sum + i.amount, 0);
  const paidItems = items.filter(
    (i) => !i.waivedAt && i.invoice.status === "PAID"
  );
  const collectionRate =
    totalCount > 0
      ? Math.round((paidItems.length / items.filter((i) => !i.waivedAt).length) * 100) || 0
      : 0;
  const avgAmount =
    totalCount > 0
      ? Math.round(items.reduce((sum, i) => sum + i.amount, 0) / totalCount)
      : 0;

  // Get properties for filter dropdown
  const properties = await prisma.property.findMany({
    where: { landlordId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    stats: { totalCount, totalRevenue, collectionRate, avgAmount },
    items: items.map((item) => ({
      id: item.id,
      date: item.createdAt,
      tenantName: item.invoice.tenant.user.name,
      tenantId: item.invoice.tenant.id,
      propertyName: item.invoice.tenant.unit.property.name,
      propertyId: item.invoice.tenant.unit.property.id,
      unitNumber: item.invoice.tenant.unit.unitNumber,
      invoiceNumber: item.invoice.invoiceNumber,
      invoiceId: item.invoice.id,
      amount: item.amount,
      status: item.waivedAt
        ? "WAIVED"
        : item.invoice.status === "PAID"
          ? "PAID"
          : "UNPAID",
      waivedAt: item.waivedAt,
      waivedBy: item.waivedBy,
      waiverReason: item.waiverReason,
    })),
    properties,
  });
}

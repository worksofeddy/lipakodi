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

  const propertyFilter = propertyId
    ? { id: propertyId, landlordId: session.user.id }
    : { landlordId: session.user.id };

  const properties = await prisma.property.findMany({
    where: propertyFilter,
    include: {
      units: {
        include: {
          tenant: {
            include: {
              invoices: {
                include: { payments: true },
              },
            },
          },
        },
      },
    },
  });

  // Occupancy
  let totalUnits = 0;
  let occupiedUnits = 0;
  for (const property of properties) {
    totalUnits += property.units.length;
    occupiedUnits += property.units.filter(
      (u) => u.status === "OCCUPIED"
    ).length;
  }
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  // Revenue & arrears from invoices
  const allInvoices = properties.flatMap((p) =>
    p.units.flatMap((u) => u.tenant?.invoices || [])
  );

  // Monthly revenue for last 12 months
  const now = new Date();
  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthStr = d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    let monthRevenue = 0;
    for (const inv of allInvoices) {
      for (const payment of inv.payments) {
        if (
          payment.status === "PAID" &&
          payment.paidDate &&
          payment.paidDate >= d &&
          payment.paidDate <= monthEnd
        ) {
          monthRevenue += payment.amount;
        }
      }
    }
    revenueByMonth.push({ month: monthStr, revenue: monthRevenue });
  }

  // Current month revenue
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let monthlyRevenue = 0;
  for (const inv of allInvoices) {
    for (const payment of inv.payments) {
      if (
        payment.status === "PAID" &&
        payment.paidDate &&
        payment.paidDate >= currentMonthStart
      ) {
        monthlyRevenue += payment.amount;
      }
    }
  }

  // Total expected this month
  let totalExpected = 0;
  for (const inv of allInvoices) {
    const dueDate = new Date(inv.dueDate);
    if (
      dueDate.getMonth() === now.getMonth() &&
      dueDate.getFullYear() === now.getFullYear()
    ) {
      totalExpected += inv.totalAmount;
    }
  }
  const collectionRate =
    totalExpected > 0 ? (monthlyRevenue / totalExpected) * 100 : 0;

  // Arrears aging
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arrears = { "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 };
  let totalArrears = 0;

  for (const inv of allInvoices) {
    if (["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) {
      const outstanding = inv.totalAmount - inv.amountPaid;
      if (outstanding <= 0) continue;

      totalArrears += outstanding;
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 0) continue;
      if (daysOverdue <= 30) arrears["0-30"] += outstanding;
      else if (daysOverdue <= 60) arrears["30-60"] += outstanding;
      else if (daysOverdue <= 90) arrears["60-90"] += outstanding;
      else arrears["90+"] += outstanding;
    }
  }

  // Occupancy trend (simplified: current snapshot per property)
  const occupancyByProperty = properties.map((p) => ({
    name: p.name,
    total: p.units.length,
    occupied: p.units.filter((u) => u.status === "OCCUPIED").length,
    rate:
      p.units.length > 0
        ? (p.units.filter((u) => u.status === "OCCUPIED").length /
            p.units.length) *
          100
        : 0,
  }));

  return NextResponse.json({
    stats: {
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      collectionRate: Math.round(collectionRate * 10) / 10,
      monthlyRevenue,
      totalArrears,
    },
    revenueByMonth,
    arrears,
    occupancyByProperty,
    properties: properties.map((p) => ({ id: p.id, name: p.name })),
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paymentSchema = z.object({
  tenantId: z.string().min(1),
  amount: z.number().min(0),
  dueDate: z.string(),
  paidDate: z.string().nullable().optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "PARTIAL"]),
  method: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  let where = {};

  if (session.user.role === "TENANT") {
    const tenant = await prisma.tenant.findFirst({
      where: { userId: session.user.id },
    });
    if (!tenant) {
      return NextResponse.json([]);
    }
    where = { tenantId: tenant.id };
  } else {
    where = tenantId
      ? { tenantId, tenant: { unit: { property: { landlordId: session.user.id } } } }
      : { tenant: { unit: { property: { landlordId: session.user.id } } } };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      tenant: { include: { user: true, unit: { include: { property: true } } } },
    },
    orderBy: { dueDate: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role === "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = paymentSchema.parse(body);

    // Verify tenant belongs to landlord
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: data.tenantId,
        unit: { property: { landlordId: session.user.id } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId: data.tenantId,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        status: data.status,
        method: data.method || null,
        reference: data.reference || null,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

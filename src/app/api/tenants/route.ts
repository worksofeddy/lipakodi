import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tenantSchema = z.object({
  userId: z.string().min(1),
  unitId: z.string().min(1),
  leaseStart: z.string(),
  leaseEnd: z.string(),
  rentAmount: z.number().min(0),
  phoneNumber: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { unit: { property: { landlordId: session.user.id } } },
    include: {
      user: true,
      unit: { include: { property: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role === "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = tenantSchema.parse(body);

    // Verify unit belongs to landlord and is vacant
    const unit = await prisma.unit.findFirst({
      where: {
        id: data.unitId,
        property: { landlordId: session.user.id },
        status: "VACANT",
      },
    });

    if (!unit) {
      return NextResponse.json(
        { error: "Unit not found or already occupied" },
        { status: 400 }
      );
    }

    // Verify user exists and is a tenant role
    const user = await prisma.user.findFirst({
      where: { id: data.userId, role: "TENANT" },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Tenant user not found" },
        { status: 400 }
      );
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          userId: data.userId,
          unitId: data.unitId,
          leaseStart: new Date(data.leaseStart),
          leaseEnd: new Date(data.leaseEnd),
          rentAmount: data.rentAmount,
          phoneNumber: data.phoneNumber,
        },
      });

      await tx.unit.update({
        where: { id: data.unitId },
        data: { status: "OCCUPIED" },
      });

      return newTenant;
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

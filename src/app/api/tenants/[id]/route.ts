import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  rentAmount: z.number().min(0).optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: params.id,
      unit: { property: { landlordId: session.user.id } },
    },
    include: {
      user: true,
      unit: { include: { property: true } },
      payments: { orderBy: { dueDate: "desc" } },
      maintenanceRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = updateTenantSchema.parse(body);

    const tenant = await prisma.tenant.findFirst({
      where: {
        id: params.id,
        unit: { property: { landlordId: session.user.id } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Update user fields (name, email, phoneNumber on User)
      if (data.name || data.email || data.phoneNumber !== undefined) {
        await tx.user.update({
          where: { id: tenant.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
            ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
          },
        });
      }

      // Update tenant fields
      await tx.tenant.update({
        where: { id: params.id },
        data: {
          ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
          ...(data.rentAmount !== undefined && { rentAmount: data.rentAmount }),
          ...(data.leaseStart && { leaseStart: new Date(data.leaseStart) }),
          ...(data.leaseEnd && { leaseEnd: new Date(data.leaseEnd) }),
          ...(data.status && { status: data.status }),
        },
      });
    });

    const updated = await prisma.tenant.findFirst({
      where: { id: params.id },
      include: { user: true, unit: { include: { property: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: params.id,
      unit: { property: { landlordId: session.user.id } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: params.id },
      data: { status: "INACTIVE" },
    });
    await tx.unit.update({
      where: { id: tenant.unitId },
      data: { status: "VACANT" },
    });
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const maintenanceSchema = z.object({
  unitId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let where = {};

  if (session.user.role === "TENANT") {
    const tenant = await prisma.tenant.findFirst({
      where: { userId: session.user.id },
    });
    if (!tenant) return NextResponse.json([]);
    where = {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
    };
  } else {
    where = {
      unit: { property: { landlordId: session.user.id } },
      ...(status ? { status } : {}),
    };
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    include: {
      tenant: { include: { user: true } },
      unit: { include: { property: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = maintenanceSchema.parse(body);

    let tenantId: string;

    if (session.user.role === "TENANT") {
      const tenant = await prisma.tenant.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
      });
      if (!tenant) {
        return NextResponse.json({ error: "No active lease found" }, { status: 400 });
      }
      tenantId = tenant.id;
    } else {
      // Landlord creating on behalf — need tenantId from body
      const tenantIdFromBody = (body as { tenantId?: string }).tenantId;
      if (!tenantIdFromBody) {
        return NextResponse.json({ error: "tenantId required" }, { status: 400 });
      }
      tenantId = tenantIdFromBody;
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        tenantId,
        unitId: data.unitId,
        title: data.title,
        description: data.description,
        priority: data.priority,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

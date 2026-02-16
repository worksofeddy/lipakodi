import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const unitSchema = z.object({
  unitNumber: z.string().min(1),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  rent: z.number().min(0),
  propertyId: z.string().min(1),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");

  const where = propertyId
    ? { propertyId, property: { landlordId: session.user.id } }
    : { property: { landlordId: session.user.id } };

  const units = await prisma.unit.findMany({
    where,
    include: {
      property: true,
      tenant: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(units);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role === "TENANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = unitSchema.parse(body);

    // Verify property belongs to user
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, landlordId: session.user.id },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Auto-generate account number for M-Pesa reference
    const shortCode = property.name
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 6)
      .toUpperCase();
    const accountNumber = `${shortCode}-${data.unitNumber}`.toUpperCase();

    const unit = await prisma.unit.create({
      data: { ...data, accountNumber },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

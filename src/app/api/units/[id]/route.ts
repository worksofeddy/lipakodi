import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  unitNumber: z.string().min(1).optional(),
  accountNumber: z.string().optional().nullable(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  rent: z.number().min(0).optional(),
  status: z.enum(["VACANT", "OCCUPIED"]).optional(),
});

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
    const data = updateSchema.parse(body);

    const unit = await prisma.unit.findFirst({
      where: { id: params.id, property: { landlordId: session.user.id } },
    });

    if (!unit) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.unit.update({
      where: { id: params.id },
      data,
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

  const unit = await prisma.unit.findFirst({
    where: { id: params.id, property: { landlordId: session.user.id } },
  });

  if (!unit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.unit.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

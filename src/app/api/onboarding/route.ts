import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";

const createTokenSchema = z.object({
  unitId: z.string().min(1),
  propertyId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { unitId, propertyId } = createTokenSchema.parse(body);

    // Verify landlord owns this property and unit is vacant
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        propertyId,
        property: { landlordId: session.user.id },
        status: "VACANT",
      },
    });

    if (!unit) {
      return NextResponse.json(
        { error: "Unit not found or not vacant" },
        { status: 404 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const onboardingToken = await prisma.onboardingToken.create({
      data: {
        token,
        unitId,
        propertyId,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || req.headers.get("origin") || "";
    const link = `${baseUrl}/onboard/${token}`;

    return NextResponse.json({ token: onboardingToken.token, link });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNumber: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Find and validate token
    const onboardingToken = await prisma.onboardingToken.findUnique({
      where: { token: data.token },
      include: {
        unit: true,
        property: true,
      },
    });

    if (!onboardingToken) {
      return NextResponse.json(
        { error: "Invalid onboarding link" },
        { status: 404 }
      );
    }

    if (onboardingToken.used) {
      return NextResponse.json(
        { error: "This onboarding link has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > onboardingToken.expiresAt) {
      return NextResponse.json(
        { error: "This onboarding link has expired" },
        { status: 400 }
      );
    }

    if (onboardingToken.unit.status !== "VACANT") {
      return NextResponse.json(
        { error: "This unit is no longer available" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user, tenant, update unit, mark token as used — all in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          phoneNumber: data.phoneNumber || null,
          role: "TENANT",
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          userId: user.id,
          unitId: onboardingToken.unitId,
          phoneNumber: data.phoneNumber || null,
          rentAmount: onboardingToken.unit.rent,
          leaseStart: new Date(),
          leaseEnd: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
        },
      });

      await tx.unit.update({
        where: { id: onboardingToken.unitId },
        data: { status: "OCCUPIED" },
      });

      await tx.onboardingToken.update({
        where: { id: onboardingToken.id },
        data: {
          used: true,
          usedAt: new Date(),
          usedByUserId: user.id,
        },
      });

      return { user, tenant };
    });

    return NextResponse.json({
      success: true,
      message: "Registration successful. You can now log in.",
      tenantId: result.tenant.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Onboarding registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

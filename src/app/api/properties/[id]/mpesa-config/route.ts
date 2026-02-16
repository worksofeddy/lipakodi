import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const property = await prisma.property.findFirst({
      where: { id: params.id, landlordId: session.user.id },
    });
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const config = await prisma.mpesaConfig.findUnique({
      where: { propertyId: params.id },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error fetching M-Pesa config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const property = await prisma.property.findFirst({
      where: { id: params.id, landlordId: session.user.id },
    });
    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { consumerKey, consumerSecret, shortcode, passkey, environment } =
      body;

    if (!consumerKey || !consumerSecret || !shortcode || !passkey) {
      return NextResponse.json(
        { error: "All M-Pesa fields are required" },
        { status: 400 }
      );
    }

    const config = await prisma.mpesaConfig.upsert({
      where: { propertyId: params.id },
      update: {
        consumerKey,
        consumerSecret,
        shortcode,
        passkey,
        environment: environment || "SANDBOX",
      },
      create: {
        propertyId: params.id,
        consumerKey,
        consumerSecret,
        shortcode,
        passkey,
        environment: environment || "SANDBOX",
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Error saving M-Pesa config:", error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}

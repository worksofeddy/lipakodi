import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMpesaConfig, registerC2BUrls } from "@/lib/mpesa";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role === "TENANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await request.json();
    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    const config = await getMpesaConfig(propertyId);
    if (!config) {
      return NextResponse.json(
        { error: "M-Pesa is not configured for this property" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is not set. A public URL is required for M-Pesa callbacks." },
        { status: 400 }
      );
    }

    const confirmationUrl = `${baseUrl}/api/payments/c2b-confirmation`;
    const validationUrl = `${baseUrl}/api/payments/c2b-validation`;

    await registerC2BUrls(config, validationUrl, confirmationUrl);

    return NextResponse.json({
      success: true,
      message: "C2B URLs registered successfully",
      confirmationUrl,
      validationUrl,
    });
  } catch (error) {
    console.error("C2B URL registration error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to register C2B URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import axios from "axios";
import { prisma } from "@/lib/prisma";

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment: "SANDBOX" | "PRODUCTION";
}

interface StkPushParams {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

function getBaseUrl(environment: "SANDBOX" | "PRODUCTION"): string {
  return environment === "PRODUCTION"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+254")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  } else if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  return cleaned;
}

export async function getAccessToken(config: MpesaConfig): Promise<string> {
  const baseUrl = getBaseUrl(config.environment);
  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  const response = await axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  return response.data.access_token;
}

export async function registerC2BUrls(
  config: MpesaConfig,
  validationUrl: string,
  confirmationUrl: string
): Promise<void> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);

  await axios.post(
    `${baseUrl}/mpesa/c2b/v1/registerurl`,
    {
      ShortCode: config.shortcode,
      ResponseType: "Completed",
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function stkPush(
  config: MpesaConfig,
  params: StkPushParams
): Promise<{ CheckoutRequestID: string; ResponseCode: string }> {
  const token = await getAccessToken(config);
  const baseUrl = getBaseUrl(config.environment);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .substring(0, 14);
  const password = Buffer.from(
    `${config.shortcode}${config.passkey}${timestamp}`
  ).toString("base64");

  const phone = normalizePhoneNumber(params.phoneNumber);

  const response = await axios.post(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount),
      PartyA: phone,
      PartyB: config.shortcode,
      PhoneNumber: phone,
      CallBackURL: params.callbackUrl,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
}

export async function getMpesaConfig(
  propertyId: string
): Promise<MpesaConfig | null> {
  const config = await prisma.mpesaConfig.findUnique({
    where: { propertyId },
  });

  if (!config || !config.isActive) return null;

  return {
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    shortcode: config.shortcode,
    passkey: config.passkey,
    environment: config.environment,
  };
}

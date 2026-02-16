const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.mpesaConfig.findFirst({
    where: { propertyId: "cmllymujt0002hk5hzpswgxd2" },
  });

  if (!config) {
    console.log("No config found");
    return;
  }

  const baseUrl =
    config.environment === "PRODUCTION"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const auth = Buffer.from(
    config.consumerKey + ":" + config.consumerSecret
  ).toString("base64");

  const tokenRes = await axios.get(
    baseUrl + "/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: "Basic " + auth } }
  );
  const token = tokenRes.data.access_token;
  console.log("Got access token");

  const ngrokUrl = "https://001e-105-165-155-127.ngrok-free.app";
  const res = await axios.post(
    baseUrl + "/mpesa/c2b/v1/registerurl",
    {
      ShortCode: config.shortcode,
      ResponseType: "Completed",
      ConfirmationURL: ngrokUrl + "/api/payments/c2b-confirmation",
      ValidationURL: ngrokUrl + "/api/payments/c2b-validation",
    },
    { headers: { Authorization: "Bearer " + token } }
  );

  console.log("C2B Registration response:", JSON.stringify(res.data, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.response?.data || e.message);
  process.exit(1);
});

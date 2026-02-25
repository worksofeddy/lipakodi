import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, DoorOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { OnboardForm } from "./onboard-form";

export default async function OnboardPage({
  params,
}: {
  params: { token: string };
}) {
  const onboardingToken = await prisma.onboardingToken.findUnique({
    where: { token: params.token },
    include: {
      unit: true,
      property: true,
    },
  });

  if (!onboardingToken) {
    notFound();
  }

  if (onboardingToken.used) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            This onboarding link has already been used.
          </p>
          <a href="/login" className="text-primary underline mt-2 inline-block">
            Go to Login
          </a>
        </CardContent>
      </Card>
    );
  }

  if (new Date() > onboardingToken.expiresAt) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            This onboarding link has expired. Please contact your landlord for a
            new link.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome to LipaKodi</h1>
        <p className="text-muted-foreground">
          You have been invited to register as a tenant. Review the details
          below and create your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{onboardingToken.property.name}</p>
              <p className="text-sm text-muted-foreground">
                {onboardingToken.property.address},{" "}
                {onboardingToken.property.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">
                Unit {onboardingToken.unit.unitNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                {onboardingToken.unit.bedrooms} bed /{" "}
                {onboardingToken.unit.bathrooms} bath
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Monthly Rent: {formatCurrency(onboardingToken.unit.rent)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <OnboardForm token={params.token} />
    </div>
  );
}

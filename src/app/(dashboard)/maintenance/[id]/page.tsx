import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { UpdateStatusButton } from "../update-status-button";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: params.id },
    include: {
      tenant: { include: { user: true } },
      unit: { include: { property: true } },
    },
  });

  if (!request) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{request.title}</h1>
          <p className="text-muted-foreground mt-1">
            Submitted by {request.tenant.user.name} on {formatDate(request.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              request.priority === "URGENT" || request.priority === "HIGH"
                ? "destructive"
                : "secondary"
            }
          >
            {request.priority}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium">{request.unit.property.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit</span>
              <span className="font-medium">{request.unit.unitNumber}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDate(request.createdAt)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolved</span>
              <span className="font-medium">
                {request.resolvedAt ? formatDate(request.resolvedAt) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdateStatusButton
              requestId={request.id}
              currentStatus={request.status}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{request.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

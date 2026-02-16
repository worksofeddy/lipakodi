import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { SubmitMaintenanceForm } from "./submit-form";

export default async function TenantMaintenancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    include: {
      unit: true,
      maintenanceRequests: {
        include: { unit: { include: { property: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You need an active lease to submit maintenance requests.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Submit and track maintenance requests</p>
        </div>
        <SubmitMaintenanceForm unitId={tenant.unitId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.maintenanceRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No maintenance requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.maintenanceRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          req.priority === "URGENT" || req.priority === "HIGH"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          req.status === "OPEN"
                            ? "outline"
                            : req.status === "IN_PROGRESS"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>
                      {req.resolvedAt ? formatDate(req.resolvedAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

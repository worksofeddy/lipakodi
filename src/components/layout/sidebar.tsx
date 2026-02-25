"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  Users,
  CreditCard,
  Wrench,
  LayoutDashboard,
  DoorOpen,
  FileText,
  BarChart3,
  Clock,
} from "lucide-react";

const landlordLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/units", label: "Units", icon: DoorOpen },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/late-fees", label: "Late Fees", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const tenantLinks = [
  { href: "/tenant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenant/payments", label: "My Payments", icon: CreditCard },
  { href: "/tenant/maintenance", label: "Maintenance", icon: Wrench },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const links = role === "TENANT" ? tenantLinks : landlordLinks;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow border-r bg-white pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-6">
          <Home className="h-8 w-8 text-primary mr-2" />
          <span className="text-xl font-bold text-primary">LipaKodi</span>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <link.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

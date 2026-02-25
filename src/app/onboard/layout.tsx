import { Home } from "lucide-react";

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center">
          <Home className="h-6 w-6 text-primary mr-2" />
          <span className="text-lg font-bold text-primary">LipaKodi</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto py-8 px-4">{children}</main>
    </div>
  );
}

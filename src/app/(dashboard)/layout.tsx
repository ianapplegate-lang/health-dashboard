import { getCurrentDbUser } from "@/lib/session";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardTabs } from "@/components/DashboardTabs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentDbUser();
  return (
    <>
      <DashboardHeader userId={user.id} />
      <DashboardTabs />
      <div className="main">{children}</div>
    </>
  );
}

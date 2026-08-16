import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";
import { BottomNav } from "../components/BottomNav";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getMxUser();
  if (!user) redirect("/login");
  return (
    <div className="pb-20">
      {children}
      <BottomNav />
    </div>
  );
}

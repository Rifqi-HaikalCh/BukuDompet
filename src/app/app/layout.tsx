import { UserAppShell } from "@/components/user/UserAppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserAppShell>{children}</UserAppShell>;
}

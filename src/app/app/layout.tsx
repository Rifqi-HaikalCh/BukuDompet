import { AppProviders } from "@/components/ui/AppProviders";
import { UserAppShell } from "@/components/user/UserAppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders auth="required">
      <UserAppShell>{children}</UserAppShell>
    </AppProviders>
  );
}

import { AppProviders } from "@/components/ui/AppProviders";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProviders auth="none">{children}</AppProviders>;
}

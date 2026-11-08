import { AppProviders } from "@/components/ui/AppProviders";

export default function SegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProviders auth="required" roles={["supervisor"]}>{children}</AppProviders>;
}

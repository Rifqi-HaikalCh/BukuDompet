import LoginPage from "./login/page";
import { AppProviders } from "@/components/ui/AppProviders";

export default function HomePage() {
  return (
    <AppProviders auth="none">
      <LoginPage />
    </AppProviders>
  );
}

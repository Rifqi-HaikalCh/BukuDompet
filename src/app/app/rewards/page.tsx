import { SoftRedirect } from "@/components/ui/SoftRedirect";

/** Rute lama: Hadiah & pencairan poin digabung ke "Misi, Medali & Hadiah". */
export default function RewardsRedirectPage() {
  return <SoftRedirect to="/app/quests" label="Misi, Medali & Hadiah" />;
}

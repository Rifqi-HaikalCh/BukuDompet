import { SoftRedirect } from "@/components/ui/SoftRedirect";

/** Rute lama: Misi digabung ke "Misi, Medali & Hadiah". */
export default function MissionsRedirectPage() {
  return <SoftRedirect to="/app/quests" label="Misi, Medali & Hadiah" />;
}

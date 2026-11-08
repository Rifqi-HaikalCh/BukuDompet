import { SoftRedirect } from "@/components/ui/SoftRedirect";

/** Rute lama: Detektif Kas digabung ke tab Investigasi Inspektur Saku di Jalur. */
export default function DetectiveRedirectPage() {
  return <SoftRedirect to="/app/journey?tab=detective" label="Investigasi Inspektur Saku" />;
}

import { SoftRedirect } from "@/components/ui/SoftRedirect";

/** Rute lama: Butik sudah menjadi tab di Dunia Pet & Butik. */
export default function ShopRedirectPage() {
  return <SoftRedirect to="/app/pets?tab=shop" label="Dunia Pet & Butik" />;
}

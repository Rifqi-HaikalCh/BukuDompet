import { redirect } from "next/navigation";

export default function ShopRedirectPage() {
  redirect("/app/pets?tab=shop");
}

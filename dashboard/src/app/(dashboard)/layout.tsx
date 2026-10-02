import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CatalogProvider } from "@/components/catalog-provider";
import { getCatalog } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  const catalog = await getCatalog();
  const email = data.user.email ?? "";
  const name = String(data.user.user_metadata.full_name ?? "") || email;

  return (
    <CatalogProvider catalog={catalog}>
      <AppShell user={{ name, email }}>{children}</AppShell>
    </CatalogProvider>
  );
}

import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CatalogProvider } from "@/components/catalog-provider";
import { Toaster } from "@/components/toaster";
import { getCatalog, getHospitals } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  const [catalog, hospitals] = await Promise.all([getCatalog(), getHospitals()]);
  const email = data.user.email ?? "";
  const name = String(data.user.user_metadata.full_name ?? "") || email;

  return (
    <CatalogProvider catalog={catalog}>
      <AppShell user={{ name, email }} hospitals={hospitals.map(({ id, name, city }) => ({ id, name, city }))}>
        {children}
      </AppShell>
      <Toaster />
    </CatalogProvider>
  );
}

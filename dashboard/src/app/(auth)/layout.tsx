import Image from "next/image";

import logo from "../../../public/databiota-logo.png";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#172a3d] px-4 py-12 text-[#1a1a1a]">
      <div className="w-full max-w-sm">
        <Image src={logo} alt="Databiota" priority className="mb-6 h-auto w-40" />

        <div className="rounded-xl bg-white px-7 py-8 shadow-2xl sm:px-9">{children}</div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { getServerUserId } from "@/server/auth/user";
import { QueryClientProvider } from "./QueryClientProvider";

export const metadata: Metadata = {
  title: "OmniCRM",
};

export default async function AuthorisedLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  try {
    await getServerUserId();
  } catch {
    redirect("/login");
  }

  return (
    <QueryClientProvider>
      <MainLayout>{children}</MainLayout>
    </QueryClientProvider>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { getServerUserId } from "@/server/auth/user";

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

  return <MainLayout>{children}</MainLayout>;
}

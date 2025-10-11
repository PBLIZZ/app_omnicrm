import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { getAuthUserId } from "@/lib/auth-simple";

export const metadata: Metadata = {
  title: "OmniCRM",
};

export default async function AuthorisedLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  try {
    await getAuthUserId();
  } catch {
    redirect("/login");
  }

  return <MainLayout>{children}</MainLayout>;
}

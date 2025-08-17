import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";

export const metadata: Metadata = {
  title: "Contact · OmniCRM",
};

export default async function ContactDetailLayout({ children }: { children: React.ReactNode }) {
  try {
    await getServerUserId();
  } catch {
    redirect("/login");
  }
  return children;
}

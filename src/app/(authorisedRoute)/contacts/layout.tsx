import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUserId } from "@/server/auth/user";

export const metadata: Metadata = {
  title: "Contacts · OmniCRM",
};

export default async function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  try {
    await getServerUserId();
  } catch {
    redirect("/login?next=/contacts");
  }
  return children;
}

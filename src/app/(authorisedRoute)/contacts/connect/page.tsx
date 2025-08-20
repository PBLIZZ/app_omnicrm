import { redirect } from "next/navigation";
import { ConnectDataSources } from "./ConnectDataSources";
import { getServerUserId } from "@/server/auth/user";

export default async function ConnectDataPage(): Promise<JSX.Element> {
  // Server-side auth check using Supabase SSR cookies
  try {
    await getServerUserId();
  } catch {
    redirect("/sign-in");
  }

  return <ConnectDataSources />;
}

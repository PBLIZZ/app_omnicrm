import { Metadata } from "next";
import { ConnectPage } from "@/app/(authorisedRoute)/omni-connect/_components/ConnectPage";

export const metadata: Metadata = {
  title: "OmniCRM",
  description: "Connect: Gmail intelligence and smart email digests for your wellness practice",
};

export default function Page(): JSX.Element {
  return <ConnectPage />;
}

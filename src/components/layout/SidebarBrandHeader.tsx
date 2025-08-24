import Link from "next/link";
import { SidebarHeader } from "@/components/ui/sidebar";
import Image from "next/image";

export function SidebarBrandHeader(): JSX.Element {
  return (
    <SidebarHeader>
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src="/logo.png"
            alt="OmniCRM Logo"
            className="h-7 logo-glow"
            width={28}
            height={28}
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span>OmniCRM</span>
            <span className="text-xs">
              by <span className="text-teal-500">Omnipotency ai</span>
            </span>
          </div>
        </Link>
      </div>
    </SidebarHeader>
  );
}

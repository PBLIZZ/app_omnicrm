import { Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface RouteConfig {
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  parent?: string;
  isDynamic?: boolean;
  resolver?: (id: string) => Promise<string> | string;
}

export const routeConfig: Record<string, RouteConfig> = {
  "/": {
    label: "Dashboard",
    icon: Home,
  },
  "/dashboard": {
    label: "Dashboard",
    icon: Home,
  },
  "/contacts": {
    label: "Contacts",
    parent: "/",
  },
  "/contacts/new": {
    label: "New Contact",
    parent: "/contacts",
  },
  "/contacts/import": {
    label: "Import",
    parent: "/contacts",
  },
  "/contacts/details": {
    label: "Details",
    parent: "/contacts",
  },
  "/contacts/details/[contactId]": {
    label: "Contact Details",
    parent: "/contacts/details",
    isDynamic: true,
  },
  "/contacts/details/[contactId]/edit": {
    label: "Edit",
    parent: "/contacts/details/[contactId]",
  },
  "/omni-momentum": {
    label: "Momentum",
    parent: "/",
  },
  "/marketing": {
    label: "Marketing",
    parent: "/",
  },
  "/analytics": {
    label: "Analytics",
    parent: "/",
  },
  "/omni-rhythm": {
    label: "Omni Rhythm",
    parent: "/",
  },
  "/messages": {
    label: "Messages",
    parent: "/",
  },
  "/settings": {
    label: "Settings",
    parent: "/",
  },
  "/settings/account": {
    label: "Account",
    parent: "/settings",
  },
  "/settings/onboarding": {
    label: "Intake Form",
    parent: "/settings",
  },
  "/settings/sync-preferences": {
    label: "Sync Preferences",
    parent: "/settings",
  },
  "/dashboard/manual-sync": {
    label: "Manual Sync",
    parent: "/dashboard",
  },
};

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = pathname;

  // Handle dynamic routes by finding the closest match
  if (!routeConfig[currentPath]) {
    // Check for dynamic route patterns
    const segments = currentPath.split("/").filter(Boolean);
    let testPath = "";

    for (let i = 0; i < segments.length; i++) {
      testPath += "/" + segments[i];
      if (routeConfig[testPath]) {
        currentPath = testPath;
        break;
      }

      // Check for dynamic segment patterns
      const possiblePaths = Object.keys(routeConfig).filter((path) => {
        const pathSegments = path.split("/").filter(Boolean);
        if (pathSegments.length !== segments.length) return false;

        return pathSegments.every((segment, index) => {
          return segment === segments[index] || segment.startsWith("[");
        });
      });

      if (possiblePaths.length > 0) {
        const firstPath = possiblePaths[0];
        if (!firstPath) {
          throw new Error("First path in possiblePaths is unexpectedly undefined");
        }
        currentPath = firstPath;
        break;
      }
    }
  }

  // Build breadcrumb chain by traversing parents
  while (currentPath && routeConfig[currentPath]) {
    const config = routeConfig[currentPath];
    if (!config) break;

    const breadcrumbItem: BreadcrumbItem = {
      label: config.label,
      href: currentPath,
    };

    if (config.icon) {
      breadcrumbItem.icon = config.icon;
    }

    breadcrumbs.unshift(breadcrumbItem);

    currentPath = config.parent ?? "";
  }

  return breadcrumbs;
}

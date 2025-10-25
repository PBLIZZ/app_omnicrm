"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SettingsCategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  gradient: string;
  borderColor?: string;
  badge?: string;
  status?: "connected" | "disconnected" | "active" | "inactive";
  isComplete?: boolean;
}

/**
 * SettingsCategoryCard - TaskCard-inspired settings navigation card
 *
 * Features:
 * - Gradient backgrounds for visual hierarchy
 * - Border accent colors (zone system)
 * - Status indicators (connected/active)
 * - Badges for labels
 * - Hover animations
 * - Wellness-friendly design
 */
export function SettingsCategoryCard({
  title,
  description,
  icon: Icon,
  href,
  gradient,
  borderColor = "border-gray-300",
  badge,
  status,
  isComplete,
}: SettingsCategoryCardProps): JSX.Element {
  return (
    <Link href={href} className="group">
      <Card
        className={`bg-gradient-to-br ${gradient} border-l-4 ${borderColor} hover:scale-105 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            {/* Left side: Icon + Title + Description */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Icon in frosted glass circle */}
              <div className="p-3 bg-white/60 backdrop-blur-sm rounded-full flex-shrink-0 group-hover:bg-white/80 transition-colors">
                <Icon className="h-6 w-6 text-gray-700" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg group-hover:text-gray-900 transition-colors">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {description}
                </CardDescription>
              </div>
            </div>

            {/* Right side: Badge or Status */}
            <div className="flex-shrink-0 ml-3">
              {badge && (
                <Badge variant="secondary" className="bg-white/60 backdrop-blur-sm">
                  {badge}
                </Badge>
              )}

              {status && (
                <div className="flex items-center gap-1.5">
                  {status === "connected" || status === "active" ? (
                    <>
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      <span className="text-xs font-medium text-green-700">
                        {status === "connected" ? "Connected" : "Active"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">
                        {status === "disconnected" ? "Not Connected" : "Inactive"}
                      </span>
                    </>
                  )}
                </div>
              )}

              {isComplete !== undefined && (
                <div className="flex items-center gap-1.5">
                  {isComplete ? (
                    <>
                      <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                      <span className="text-xs font-medium text-green-700">Complete</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />
                      <span className="text-xs font-medium text-amber-700">Pending</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

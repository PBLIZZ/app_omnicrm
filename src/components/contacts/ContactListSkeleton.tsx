"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ContactListSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<div key={i} className="flex items-center space-x-3 p-3">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="space-y-2 flex-1">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-3 w-[120px]" />
					</div>
				</div>
			))}
		</div>
	);
}



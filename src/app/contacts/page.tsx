"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ContactListSkeleton } from "@/components/contacts/ContactListSkeleton";
import { ContactTable } from "@/components/contacts/ContactTable";

interface ContactItem {
	id: string;
	displayName: string;
	primaryEmail?: string;
	primaryPhone?: string;
	createdAt: string;
}

export default function ContactsPage() {
	const [loading, setLoading] = useState(true);
	const [contacts, setContacts] = useState<ContactItem[]>([]);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setLoading(true);
			try {
				// Placeholder until API exists
				await new Promise((r) => setTimeout(r, 300));
				if (isMounted) setContacts([]);
			} finally {
				if (isMounted) setLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="p-6 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Contacts</span>
						<div className="flex gap-2">
							<Button asChild>
								<Link href="/settings/sync">Connect Google</Link>
							</Button>
						</div>
					</CardTitle>
					<CardDescription>Search, filter and manage your contacts.</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<ContactListSkeleton />
					) : contacts.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 space-y-4">
							<div className="rounded-full bg-muted p-4">📇</div>
							<h3 className="text-lg font-semibold">No contacts yet</h3>
							<p className="text-muted-foreground text-center max-w-sm">
								Import your existing contacts or connect Google to sync automatically.
							</p>
							<div className="flex flex-col sm:flex-row gap-3">
								<Button asChild>
									<Link href="/settings/sync">Connect Google</Link>
								</Button>
								<Button variant="outline">Import CSV</Button>
							</div>
						</div>
					) : (
						<ContactTable
							data={contacts}
							onOpen={() => { /* TODO: navigate to /contacts/[id] */ }}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}



import { useMemo } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ContactRow {
	id: string;
	displayName: string;
	primaryEmail?: string | undefined;
	primaryPhone?: string | undefined;
	createdAt?: string | undefined;
}

interface Props {
	data: ContactRow[];
	onOpen?: (id: string) => void;
}

export function ContactTable({ data, onOpen }: Props) {
	const columns = useMemo<ColumnDef<ContactRow>[]>(
		() => [
			{
				accessorKey: "displayName",
				header: "Name",
				cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
			},
			{
				accessorKey: "primaryEmail",
				header: "Email",
				cell: ({ row }) => row.original.primaryEmail || "—",
			},
			{
				accessorKey: "primaryPhone",
				header: "Phone",
				cell: ({ row }) => row.original.primaryPhone || "—",
			},
			{
				accessorKey: "createdAt",
				header: "Added",
				cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString("en-GB") : "—"),
			},
		],
		[],
	);

	const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id} className="cursor-pointer" onClick={() => onOpen?.(row.original.id)}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
								No contacts found
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}



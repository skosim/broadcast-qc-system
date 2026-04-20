"use client";

import Link from "next/link";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

type ClubRow = {
  slug: string;
  name: string;
  city: string;
  league: string;
  group: string;
  stadium: string;
  totalIssues: number;
  unresolvedIssues: number;
  recurringIssues: number;
  hasCameraPlan: boolean;
  lastUpdated: Date;
  tags: Array<{ code: string; label: string }>;
};

const helper = createColumnHelper<ClubRow>();

export function ClubsDataTable({ rows, seasonSlug }: { rows: ClubRow[]; seasonSlug?: string }) {
  const columns = [
    helper.accessor("name", {
      header: "Клуб",
      cell: (info) => (
        <Link href={`/clubs/${info.row.original.slug}${seasonSlug ? `?season=${seasonSlug}` : ""}`} className="font-medium text-primary hover:underline">
          {info.getValue()}
        </Link>
      )
    }),
    helper.accessor("league", { header: "Лига" }),
    helper.accessor("group", { header: "Группа" }),
    helper.accessor("stadium", { header: "Стадион" }),
    helper.accessor("city", { header: "Город" }),
    helper.accessor("totalIssues", { header: "Всего проблем" }),
    helper.accessor("unresolvedIssues", { header: "Нерешенные" }),
    helper.accessor("recurringIssues", { header: "Повторяющиеся" }),
    helper.accessor("lastUpdated", {
      header: "Обновлено",
      cell: (info) => formatDateTime(info.getValue())
    })
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
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
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              Клубы пока не найдены.
            </TableCell>
          </TableRow>
        ) : null}
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

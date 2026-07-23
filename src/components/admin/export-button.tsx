"use client";

import { downloadCsv } from "@/lib/csv";

export function ExportButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, string | number>[];
}) {
  return (
    <button
      onClick={() => downloadCsv(filename, rows)}
      className="text-xs text-olive underline"
    >
      Export CSV
    </button>
  );
}

import {
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  Printer,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportFormats, exportReport, type ExportFormat, type Report } from "@/lib/report";

const formatIcons: Record<ExportFormat, typeof FileText> = {
  pdf: Printer,
  csv: Table2,
  xlsx: FileSpreadsheet,
  doc: FileType2,
  json: FileJson,
  md: FileText,
};

/** Export the dashboard currently on screen. The report is built lazily so it always reflects the latest view. */
export function ExportMenu({
  getReport,
  label = "Export",
  compact = false,
}: {
  getReport: () => Report;
  label?: string;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`share-button ${compact ? "is-compact" : ""}`}
          aria-label="Export dashboard"
        >
          <Download />
          <span>{label}</span>
          <ChevronDown className="share-chevron" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="export-menu">
        <DropdownMenuLabel className="export-menu-label">Export this view as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {exportFormats.map((format) => {
          const Icon = formatIcons[format.id];
          return (
            <DropdownMenuItem
              key={format.id}
              className="export-menu-item"
              onSelect={() => exportReport(getReport(), format.id)}
            >
              <Icon />
              <span>
                <strong>{format.label}</strong>
                <small>{format.hint}</small>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

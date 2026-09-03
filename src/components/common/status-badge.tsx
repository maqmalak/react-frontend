import { Badge, statusVariant } from "@/components/ui/badge";

export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  if (!status) return <Badge variant="outline" className={className}>—</Badge>;
  return (
    <Badge variant={statusVariant(status)} dot className={className}>
      {status}
    </Badge>
  );
}
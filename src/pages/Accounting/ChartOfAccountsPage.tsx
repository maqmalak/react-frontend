import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { useChartOfAccounts } from "@/hooks/useAccounting";
import { useCompanyContext } from "@/hooks/useCompanyContext";
import { cn } from "@/utils/cn";
import type { Account } from "@/types/frappe";

const ROOT_TYPE_BADGE: Record<string, "success" | "destructive" | "info" | "warning" | "default"> = {
  Asset: "success",
  Liability: "destructive",
  Equity: "info",
  Income: "success",
  Expense: "warning",
};

interface TreeNode extends Account {
  children: TreeNode[];
}

function buildTree(accounts: Account[]): TreeNode[] {
  const byName = new Map<string, TreeNode>(accounts.map((a) => [a.name, { ...a, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of byName.values()) {
    const parent = node.parent_account ? byName.get(node.parent_account) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function TreeRow({ node, depth, expanded, onToggle }: { node: TreeNode; depth: number; expanded: Set<string>; onToggle: (name: string) => void }) {
  const isGroup = Boolean(node.is_group) && node.children.length > 0;
  const isOpen = expanded.has(node.name);

  return (
    <div>
      <button
        type="button"
        onClick={() => isGroup && onToggle(node.name)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
          !isGroup && "cursor-default",
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {isGroup ? (
          isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {isGroup ? (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className={cn("truncate", isGroup && "font-medium")}>{node.account_name || node.name}</span>
        {node.account_number && <span className="shrink-0 text-xs text-muted-foreground">#{node.account_number}</span>}
        {depth === 0 && node.root_type && (
          <Badge variant={ROOT_TYPE_BADGE[node.root_type] ?? "default"} className="ml-auto shrink-0">
            {node.root_type}
          </Badge>
        )}
        {node.disabled ? <Badge variant="destructive" className="shrink-0">Disabled</Badge> : null}
      </button>
      {isGroup && isOpen && (
        <div>
          {node.children
            .slice()
            .sort((a, b) => (a.is_group === b.is_group ? 0 : a.is_group ? -1 : 1))
            .map((child) => (
              <TreeRow key={child.name} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
            ))}
        </div>
      )}
    </div>
  );
}

/** Chart of Accounts — the Account doctype's tree, built client-side from `parent_account`. */
export function ChartOfAccountsPage() {
  const { company, companies } = useCompanyContext();
  const { data, error, isLoading, mutate } = useChartOfAccounts(company);
  const tree = useMemo(() => buildTree(data ?? []), [data]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const expandAll = () => setExpanded(new Set((data ?? []).filter((a) => a.is_group).map((a) => a.name)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chart of Accounts"
        subtitle={company ? `Company: ${company}` : "Select a company"}
        actions={
          <div className="flex gap-2 text-xs">
            <button onClick={expandAll} className="rounded-md border border-input px-2.5 py-1.5 hover:bg-accent">
              Expand All
            </button>
            <button onClick={collapseAll} className="rounded-md border border-input px-2.5 py-1.5 hover:bg-accent">
              Collapse All
            </button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={() => void mutate()} />
          ) : !company ? (
            <EmptyState title="No company selected" description={`Choose a company to view its Chart of Accounts.${companies.length === 0 ? "" : ""}`} />
          ) : tree.length === 0 ? (
            <EmptyState title="No accounts found" description="This company has no Chart of Accounts set up yet." />
          ) : (
            <div className="scrollbar-thin max-h-[70vh] overflow-y-auto">
              {tree
                .slice()
                .sort((a, b) => (a.lft ?? 0) - (b.lft ?? 0))
                .map((root) => (
                  <TreeRow key={root.name} node={root} depth={0} expanded={expanded} onToggle={toggle} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

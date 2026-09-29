import { ConfigRoutes } from "@/components/doc/config-routes";
import { APPROVAL_CONFIGS } from "./approval-configs";

/** /approvals/* — list and form for every Approvals DocType. */
export function ApprovalsRoutes() {
  return <ConfigRoutes prefix="approvals" configs={APPROVAL_CONFIGS} />;
}

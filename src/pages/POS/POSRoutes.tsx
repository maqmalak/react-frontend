import { ConfigRoutes } from "@/components/doc/config-routes";
import { POS_CONFIGS } from "./pos-configs";

/** /pos/* — list and form for every POS DocType. */
export function POSRoutes() {
  return <ConfigRoutes prefix="pos" configs={POS_CONFIGS} />;
}

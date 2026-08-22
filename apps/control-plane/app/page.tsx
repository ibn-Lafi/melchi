import { redirect } from "next/navigation";

export default function ControlPlaneRootPage() {
  redirect("/tenants");
}

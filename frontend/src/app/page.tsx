import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get("omnicare_access")?.value);
  redirect(hasSession ? "/dashboard" : "/login");
}

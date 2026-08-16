import { redirect } from "next/navigation";
import { getMxUser } from "@/lib/mainxp/auth";

export default async function Index() {
  const user = await getMxUser();
  redirect(user ? "/today" : "/login");
}

import { redirect } from "next/navigation";

export default function EditingRedirectPage() {
  redirect("/dashboard/meals");
}

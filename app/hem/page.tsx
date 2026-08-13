import { redirect } from "next/navigation";

/** Old home URL — keep working for bookmarks / older SMS links. */
export default function HemRedirect() {
  redirect("/");
}

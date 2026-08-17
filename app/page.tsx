import { redirect } from "next/navigation";

/** App entry — guests land on challenges, not the old home screen. */
export default function Home() {
  redirect("/challenges");
}

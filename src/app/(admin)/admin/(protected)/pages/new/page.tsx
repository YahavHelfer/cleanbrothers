import Link from "next/link";
import { notFound } from "next/navigation";
import { NewPageCreateForm } from "@/cms/pages/NewPageForms";
import { newPagesEnvironmentAllowed } from "@/cms/pages/new-environment";

export default function NewPage() {
  if (!newPagesEnvironmentAllowed()) notFound();
  return <section className="grid gap-6"><Link href="/admin/pages" prefetch={false}>חזרה לעמודים</Link>
    <h1 className="text-3xl font-black">יצירת עמוד חדש</h1><NewPageCreateForm /></section>;
}

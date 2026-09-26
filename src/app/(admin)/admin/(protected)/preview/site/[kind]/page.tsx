import Link from "next/link";
import { notFound } from "next/navigation";
import { siteEnvironmentAllowed } from "@/cms/site/environment";
import { siteKinds, siteTargetPath, type SiteDocumentKind, type SiteFooter,
  type SiteNavigation, type SiteSettings } from "@/cms/site/model";
import { getSiteEditor, getSitePageRoutes, getSiteRevision } from "@/cms/site/repository";

export default async function SitePreview({ params,searchParams }: {
  params: Promise<{kind:string}>; searchParams: Promise<{revision?:string}>;
}) {
  if (!siteEnvironmentAllowed()) notFound();
  const {kind}=await params; const {revision}=await searchParams;
  if (!siteKinds.includes(kind as SiteDocumentKind) || !revision) notFound();
  const documentKind=kind as SiteDocumentKind;
  const [exact,settingsEditor,navigationEditor,footerEditor,pageRoutes]=await Promise.all([
    getSiteRevision(documentKind,revision),getSiteEditor("settings"),getSiteEditor("navigation"),
    getSiteEditor("footer"),getSitePageRoutes(),
  ]);
  if (!exact || !settingsEditor.snapshot || !navigationEditor.snapshot || !footerEditor.snapshot) notFound();
  const settings=(documentKind==="settings"?exact.payload:settingsEditor.snapshot.draft) as SiteSettings;
  const navigation=(documentKind==="navigation"?exact.payload:navigationEditor.snapshot.draft) as SiteNavigation;
  const footer=(documentKind==="footer"?exact.payload:footerEditor.snapshot.draft) as SiteFooter;
  return <section className="grid gap-6" aria-label="תצוגה מקדימה פרטית של מעטפת האתר">
    <div className="rounded-2xl border p-4"><b>תצוגה מקדימה — {documentKind}, גרסה {exact.number}</b>
      <p>התצוגה פרטית. קישורים ופעולות קשר אינם פעילים כאן; פרסום ציבורי הוא פעולה נפרדת.</p></div>
    <header className="rounded-2xl border theme-card p-5"><p className="text-xl font-black">{settings.businessName}</p>
      <nav aria-label="ניווט טיוטה" className="flex flex-wrap gap-4">
        {navigation.items.filter(item=>item.visible).map(item=><span key={item.id} className="rounded-xl border px-3 py-2">
          {item.label} <small><bdi>{siteTargetPath(item.target,pageRoutes)||"יעד לא מפורסם"}</bdi></small></span>)}
      </nav></header>
    <main className="rounded-2xl border p-8"><h1 className="text-3xl font-black">תצוגת מעטפת עמוד</h1>
      <p>תוכן העמוד אינו נערך בשלב זה.</p></main>
    <footer className="grid gap-4 rounded-2xl border theme-card p-5"><p>{footer.description}</p>
      <p>טלפון: <bdi>{settings.phoneDisplay}</bdi> · אימייל: <bdi>{settings.email}</bdi></p>
      <p>אזורי שירות: {settings.serviceAreas.join(" · ")}</p>
      <p>שירותים: {footer.featuredServices.join(" · ")}</p>
      <p>קישורים משפטיים: {footer.legal.filter(item=>item.visible).map(item=>item.label).join(" · ")}</p>
      <p>{footer.whatsappCtaLabel} — פעולה מושבתת בתצוגה מקדימה</p>
      <p>{footer.copyright} · {footer.tagline}</p>
    </footer>
    <Link href={`/admin/site/${documentKind}`} prefetch={false}>חזרה לעורך</Link>
  </section>;
}

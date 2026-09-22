// No form element, action, client JavaScript, tracking, or submission behavior.
export function PreviewContact({ serviceName }: { serviceName: string }) {
  return <div className="card-lift rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8">
    <div className="mb-5 border-b border-slate-200 pb-4 sm:mb-7 sm:pb-5">
      <p className="text-sm font-black text-turquoise-dark">טופס מהיר — תצוגה בלבד</p>
      <h2 className="mt-2 text-xl font-black sm:text-2xl">מעדיפים שנחזור אליכם?</h2>
      <p className="mt-2 text-sm leading-7 theme-muted sm:text-base">לא ניתן לשלוח פניות מתוך תצוגה מקדימה.</p>
    </div>
    <fieldset disabled className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      <label className="grid gap-2 font-bold">שם מלא<input className="field" placeholder="ישראל ישראלי" /></label>
      <label className="grid gap-2 font-bold">טלפון<input className="field" type="tel" placeholder="0559577731" /></label>
      <label className="grid gap-2 font-bold">סוג השירות<select className="field"><option>{serviceName}</option></select></label>
      <label className="grid gap-2 font-bold">עיר<input className="field" placeholder="לדוגמה: תל אביב" /></label>
      <label className="grid gap-2 font-bold sm:col-span-2">הודעה<textarea className="field min-h-32 resize-none" /></label>
    </fieldset>
    <button type="button" disabled className="btn-primary mt-5 inline-flex opacity-60 sm:mt-7">שליחת פנייה מושבתת בתצוגה</button>
  </div>;
}

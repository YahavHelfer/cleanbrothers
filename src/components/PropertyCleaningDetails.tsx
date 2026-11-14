export function PropertyCleaningDetails() {
  return <section className="section-block theme-section-clean" aria-labelledby="property-scope-title">
    <div className="section-container">
      <p className="text-sm font-black text-turquoise-dark">מתאמים היקף ברור לפני שמתחילים</p>
      <h2 id="property-scope-title" className="mt-2 text-3xl font-black">איזה ניקיון הנכס שלכם צריך?</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border theme-card p-6">
          <h3 className="text-xl font-black">ניקיון אחרי שיפוץ</h3>
          <p className="mt-3 leading-8 theme-muted">ממקדים את ההצעה באבק ובלכלוך שנותרו אחרי עבודת בעלי המקצוע, במשטחים ובאזורים שדורשים טיפול. שאריות צבע, רובה או דבק נבדקות לפי סוג החומר והמשטח; לא מבטיחים הסרה מלאה לפני הבדיקה.</p>
        </div>
        <div className="rounded-2xl border theme-card p-6">
          <h3 className="text-xl font-black">ניקיון לפני אכלוס ודירה חדשה מקבלן</h3>
          <p className="mt-3 leading-8 theme-muted">מתכננים ניקיון לדירה חדשה מקבלן או לדירה יד שנייה לפני כניסה. מציינים אם הנכס ריק, אילו אזורים נגישים ומה חשוב לנקות לפני הכנסת רהיטים וחפצים.</p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border theme-card p-6">
        <h3 className="text-xl font-black">מה מבררים בהצעת המחיר?</h3>
        <ul className="mt-3 grid list-disc gap-3 ps-5 leading-8 md:grid-cols-2">
          <li>גודל הנכס, מספר החדרים ומצב הלכלוך.</li>
          <li>היקף ניקוי הרצפות, הפנלים והמשטחים הנגישים.</li>
          <li>האם נכללים חלונות נגישים, מסילות, מטבח או חדרי רחצה.</li>
          <li>היישוב, הקומה, המעלית והחניה לציוד; זמינות מים וחשמל ומועד הכניסה המתוכנן.</li>
        </ul>
        <p className="mt-4 leading-8 theme-muted">אין מחיר אחיד לכל דירה. ההצעה נקבעת לפי הנכס והאזורים שסוכמו; חלונות, פנים ארונות, פוליש וטיפול בשאריות בנייה אינם תוספות שאפשר להניח שכלולות בלי תיאום.</p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <a href="#contact-form" className="btn-primary">השאירו פרטים להצעת מחיר לנכס</a>
        <p className="text-sm leading-7 theme-muted">יישוב, גודל משוער ומועד כניסה יעזרו להתחיל. אפשר לצרף תמונות ב־WhatsApp.</p>
      </div>
    </div>
  </section>;
}

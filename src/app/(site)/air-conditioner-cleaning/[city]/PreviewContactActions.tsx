"use client";

import { useState } from "react";

export function PreviewContactActions() {
  const [result, setResult] = useState("");

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setResult("בדיקת WhatsApp בוצעה. לא נפתחה שיחה ולא נשלחה הודעה.")}
        >
          תיאום ב־WhatsApp
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setResult("בדיקת כפתור הטלפון בוצעה. לא בוצעה שיחה.")}
        >
          התקשרו אלינו
        </button>
        <a href="#contact" className="btn-secondary">השאירו פרטים</a>
      </div>
      <p className="mt-3 text-sm">כפתורי הקשר מדמים את הפעולה. הטופס משתמש בנתוני דמה בלבד.</p>
      <p role="status" className="mt-2 min-h-5 text-sm font-semibold">{result}</p>
    </>
  );
}

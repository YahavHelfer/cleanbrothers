"use client";

import { FormEvent, useState } from "react";
import { serviceOptions } from "@/data/site";

type FormState = {
  fullName: string;
  phone: string;
  service: string;
  city: string;
  message: string;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  service: "",
  city: "",
  message: "",
};

export function ContactForm() {
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitted(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Partial<FormState> = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "נא למלא שם מלא";
    }

    if (!values.phone.trim()) {
      nextErrors.phone = "נא למלא מספר טלפון";
    }

    if (!values.service) {
      nextErrors.service = "נא לבחור סוג שירות";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true);
      setValues(initialState);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card-lift rounded-[1.5rem] border theme-card p-5 sm:rounded-[2rem] sm:p-8"
    >
      <div className="mb-5 border-b border-slate-200 pb-4 sm:mb-7 sm:pb-5">
        <p className="text-sm font-black text-turquoise-dark">טופס מהיר</p>
        <h2 className="mt-2 text-xl font-black sm:text-2xl">
          מעדיפים שנחזור אליכם?
        </h2>
        <p className="mt-2 text-sm leading-7 theme-muted sm:text-base">
          אפשר להשאיר פרטים כאן, אבל לקבלת הערכת מחיר מדויקת ומהירה יותר כדאי
          לשלוח תמונה בוואטסאפ.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <label className="grid gap-2 font-bold">
          שם מלא
          <input
            id="fullName"
            name="fullName"
            className="field"
            type="text"
            value={values.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="ישראל ישראלי"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
          {errors.fullName ? (
            <span id="fullName-error" className="text-sm text-red-600">
              {errors.fullName}
            </span>
          ) : null}
        </label>

        <label className="grid gap-2 font-bold">
          טלפון
          <input
            id="phone"
            name="phone"
            className="field"
            type="tel"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="05X-XXXXXXX"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone ? (
            <span id="phone-error" className="text-sm text-red-600">
              {errors.phone}
            </span>
          ) : null}
        </label>

        <label className="grid gap-2 font-bold">
          סוג השירות
          <select
            id="service"
            name="service"
            className="field"
            value={values.service}
            onChange={(event) => updateField("service", event.target.value)}
            aria-invalid={Boolean(errors.service)}
            aria-describedby={errors.service ? "service-error" : undefined}
          >
            <option value="" disabled>
              בחרו שירות
            </option>
            {serviceOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          {errors.service ? (
            <span id="service-error" className="text-sm text-red-600">
              {errors.service}
            </span>
          ) : null}
        </label>

        <label className="grid gap-2 font-bold">
          עיר
          <input
            id="city"
            name="city"
            className="field"
            type="text"
            value={values.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="לדוגמה: תל אביב"
          />
        </label>

        <label className="grid gap-2 font-bold sm:col-span-2">
          הודעה
          <textarea
            id="message"
            name="message"
            className="field min-h-32 resize-none"
            value={values.message}
            onChange={(event) => updateField("message", event.target.value)}
            placeholder="כתבו בקצרה מה תרצו לנקות ומה מצב הריפוד"
          />
        </label>
      </div>

      <button
        type="submit"
        aria-label="שליחת פנייה באתר CleanBrothers"
        className="btn-primary mt-5 inline-flex sm:mt-7"
      >
        שליחת פנייה
      </button>

      {submitted ? (
        <p className="mt-4 rounded-2xl bg-turquoise/15 p-4 text-sm font-bold text-turquoise-dark">
          הפנייה נקלטה בצד האתר. בשלב הבא נחבר את הטופס לשליחה אמיתית.
        </p>
      ) : (
        <p className="mt-4 text-sm theme-muted">
          הטופס אינו מחובר עדיין. להצעת מחיר בוואטסאפ תוך דקות, שלחו תמונה.
        </p>
      )}
    </form>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { MediaChoice } from "@/cms/media/model";
import { homeImagePositions, type HomeServiceImage } from "./service-card-images";

const button = "rounded-xl border px-3 py-2 font-bold";
export function ServiceCardImagesEditor({ images, choices, onChange }: {
  images: HomeServiceImage[]; choices: MediaChoice[]; onChange: (images: HomeServiceImage[]) => void;
}) {
  const available = choices.filter(choice => !choice.archived && !images.some(image => image.versionId === choice.versionId));
  return <fieldset className="grid gap-3 rounded-xl border p-3" aria-label="תמונות השירות">
    <legend className="font-black">תמונות השירות</legend>
    <p className="text-sm theme-muted">השינויים בתמונות השירות חלים יחד בעמוד הבית, ברשימת השירותים ובעמוד השירות. שמרו טיוטה ואז פרסמו את דף הבית כדי לעדכן את כל העמודים.</p>
    {images.map((image, index) => {
      const choice = choices.find(item => item.versionId === image.versionId);
      const update = (next: HomeServiceImage) => onChange(images.map((item, i) => i === index ? next : item));
      const move = (offset: number) => {
        const next = [...images];
        [next[index], next[index + offset]] = [next[index + offset], next[index]];
        onChange(next);
      };
      return <div key={index} className="grid gap-3 rounded-xl border p-3" data-home-service-image={index}>
        {choice && <Image src={choice.src} alt={image.alt} width={240} height={150} unoptimized className="h-36 w-full object-contain" />}
        <label className="grid gap-2 font-bold">תמונת שירות {index + 1}
          <select className="field w-full" value={image.versionId} onChange={event => {
            const selected = choices.find(item => item.versionId === event.target.value)!;
            update({ ...image, versionId: selected.versionId, alt: selected.altText });
          }}>
            {!choice && <option value={image.versionId}>התמונה השמורה</option>}
            {choices.filter(item => !item.archived || item.versionId === image.versionId).map(item =>
              <option key={item.versionId} value={item.versionId}
                disabled={images.some(other => other.versionId === item.versionId) && item.versionId !== image.versionId}>
                {item.label} — גרסה {item.number}{item.archived ? " (בארכיון)" : ""}
              </option>)}
          </select>
        </label>
        <label className="grid gap-2 font-bold">תיאור חלופי לתמונת שירות {index + 1}
          <input className="field w-full" value={image.alt} required maxLength={300}
            onChange={event => update({ ...image, alt: event.target.value })} />
        </label>
        <label className="grid gap-2 font-bold">מיקום תמונת שירות {index + 1}
          <select className="field w-full" value={image.position} onChange={event => update({ ...image, position: event.target.value })}>
            {homeImagePositions.map((position, i) => <option key={position} value={position}>
              {["מרכז", "מרכז, מעט למעלה", "מעט ימינה", "מרכז ימינה", "מרכז עליון", "מרכז גבוה", "מרכז, מעט למטה"][i]}
            </option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className={button} type="button" disabled={index === 0} onClick={() => move(-1)} aria-label={`העלאת תמונת שירות ${index + 1}`}>למעלה</button>
          <button className={button} type="button" disabled={index === images.length - 1} onClick={() => move(1)} aria-label={`הורדת תמונת שירות ${index + 1}`}>למטה</button>
          <button className={button} type="button" onClick={() => onChange(images.filter((_, i) => i !== index))} aria-label={`הסרת תמונת שירות ${index + 1}`}>הסרה</button>
        </div>
      </div>;
    })}
    {!images.length && <p>אין תמונות. תוצג חלופה מעוצבת ללא החזרת תמונות שהוסרו.</p>}
    <button className={`${button} justify-self-start`} type="button" disabled={images.length >= 8 || !available.length}
      onClick={() => {
        const next = available[0];
        if (next) onChange([...images, { versionId: next.versionId, alt: next.altText, position: "object-center" }]);
      }}>הוספת תמונת שירות</button>
    <Link href="/admin/media" prefetch={false} target="_blank" className="underline">העלאה וניהול בספריית המדיה (בחלון חדש)</Link>
    <p className="text-sm theme-muted">לאחר העלאה בספרייה, שמרו את הטיוטה וטענו מחדש כדי לבחור את התמונה החדשה.</p>
  </fieldset>;
}

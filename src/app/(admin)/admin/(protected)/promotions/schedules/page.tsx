import { notFound } from "next/navigation";
import { ScheduleManager } from "@/cms/schedules/ScheduleManager";
import { schedulesLocalEnabled } from "@/cms/schedules/environment";
import { listSchedules } from "@/cms/schedules/repository";

export default async function SchedulesPage() {
  if (!schedulesLocalEnabled()) notFound();
  const { schedules, choices } = await listSchedules();
  return <section className="grid gap-7">
    <div><h1 className="text-3xl font-black">מבצעים מתוזמנים</h1>
      <p className="mt-2">יסודות מקומיים בלבד. תזמון אינו מפרסם תוכן בלי מנוע מתזמן מהימן.</p></div>
    <ScheduleManager schedules={schedules} choices={choices} />
  </section>;
}

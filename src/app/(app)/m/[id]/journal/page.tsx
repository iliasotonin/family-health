import { prisma } from "@/lib/db";
import QuickVitals from "@/components/journal/QuickVitals";
import DiarySection from "@/components/journal/DiarySection";
import MedsSection from "@/components/journal/MedsSection";
import VaccinationsSection from "@/components/journal/VaccinationsSection";

export const dynamic = "force-dynamic";

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [diary, meds, vaccinations] = await Promise.all([
    prisma.diaryEntry.findMany({ where: { memberId: id }, orderBy: { date: "desc" }, take: 30 }),
    prisma.medication.findMany({ where: { memberId: id }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.vaccination.findMany({ where: { memberId: id }, orderBy: { date: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <QuickVitals memberId={id} />
      <DiarySection
        memberId={id}
        entries={diary.map((d) => ({
          id: d.id,
          date: d.date.toISOString(),
          mood: d.mood,
          symptoms: d.symptoms,
          note: d.note,
        }))}
      />
      <MedsSection
        memberId={id}
        meds={meds.map((m) => ({ id: m.id, name: m.name, dose: m.dose, schedule: m.schedule, active: m.active }))}
      />
      <VaccinationsSection
        memberId={id}
        vaccinations={vaccinations.map((v) => ({
          id: v.id,
          name: v.name,
          date: v.date.toISOString(),
          dose: v.dose,
          note: v.note,
        }))}
      />
    </div>
  );
}

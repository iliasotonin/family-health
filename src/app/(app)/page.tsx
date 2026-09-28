import Link from "next/link";
import { prisma } from "@/lib/db";
import Avatar from "@/components/Avatar";
import AddMemberForm from "@/components/AddMemberForm";
import { roleLabel, ageFromBirth } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const members = await prisma.member.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { documents: true, measurements: true, geneticVariants: true },
      },
    },
  });

  const insights = await prisma.insight.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { member: true },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Семья</h1>
          <p className="text-muted text-sm">Всё о здоровье в одном месте</p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="card p-8 text-center space-y-4">
          <div className="text-3xl">👨‍👩‍👧‍👦</div>
          <p className="text-muted">Добавьте первого члена семьи, чтобы начать</p>
          <div className="flex justify-center">
            <AddMemberForm />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => {
              const age = ageFromBirth(m.birthDate);
              return (
                <Link key={m.id} href={`/m/${m.id}`} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} color={m.color} size={44} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-sm text-muted">
                        {roleLabel(m.role)}
                        {age != null ? ` · ${age} лет` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4 text-sm text-muted">
                    <span>{m._count.documents} док.</span>
                    <span>{m._count.measurements} показ.</span>
                    <span>{m._count.geneticVariants} ген.</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <AddMemberForm />
        </>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Последние инсайты</h2>
          <div className="space-y-2">
            {insights.map((i) => (
              <div key={i.id} className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={
                      i.severity === "urgent"
                        ? "pill pill-bad"
                        : i.severity === "attention"
                        ? "pill pill-warn"
                        : "pill pill-muted"
                    }
                  >
                    {i.member?.name || "Семья"}
                  </span>
                  <span className="font-medium text-sm">{i.title}</span>
                </div>
                <p className="text-sm text-muted line-clamp-2 whitespace-pre-wrap">{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

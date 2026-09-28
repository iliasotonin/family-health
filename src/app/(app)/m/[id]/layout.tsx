import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Avatar from "@/components/Avatar";
import MemberTabs from "@/components/MemberTabs";
import { roleLabel, ageFromBirth } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) notFound();

  const age = ageFromBirth(member.birthDate);

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Семья
      </Link>
      <div className="flex items-center gap-3">
        <Avatar name={member.name} color={member.color} size={52} />
        <div>
          <h1 className="text-xl font-semibold">{member.name}</h1>
          <p className="text-sm text-muted">
            {roleLabel(member.role)}
            {age != null ? ` · ${age} лет` : ""}
          </p>
        </div>
      </div>
      <MemberTabs memberId={member.id} />
      <div>{children}</div>
    </div>
  );
}

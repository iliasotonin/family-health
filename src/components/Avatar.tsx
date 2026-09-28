import { initials } from "@/lib/domain";

export default function Avatar({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{
        background: color,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </span>
  );
}

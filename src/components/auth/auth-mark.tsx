import { cn } from "@/lib/utils";

type AuthMarkProps = {
  variant?: "light" | "dark";
  /** Circular badge like the login design */
  framed?: boolean;
  className?: string;
};

export function AuthMark({
  variant = "dark",
  framed = false,
  className,
}: AuthMarkProps) {
  const dot = variant === "light" ? "bg-white" : "bg-[#2563eb]";

  const mark = (
    <div
      className={cn("grid grid-cols-3 gap-1", framed ? "size-7" : "size-9", className)}
      aria-hidden
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "rounded-full",
            framed ? "size-1.5" : "size-2",
            dot,
            index === 4 && variant === "dark" && "bg-[#3b82f6]",
            index === 4 && variant === "light" && "bg-sky-300",
          )}
        />
      ))}
    </div>
  );

  if (!framed) return mark;

  return (
    <div className="flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
      {mark}
    </div>
  );
}

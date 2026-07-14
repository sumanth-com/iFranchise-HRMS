type ManagerModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ManagerModulePlaceholder({
  title,
  description,
}: ManagerModulePlaceholderProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Manager Portal</p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

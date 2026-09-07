export function StepHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-fg-muted text-sm">{text}</p>
    </div>
  );
}

interface DateTimeProps {
  // The timestamp to render. Accepts an ISO string, epoch number, or Date.
  value?: string | number | Date | null;
  // Classes for the outer wrapper.
  className?: string;
  // Classes for the time line (defaults to a small muted line below the date).
  timeClassName?: string;
  // Shown when the value is missing or unparseable.
  emptyText?: string;
  // Locale options for the date line (time is always hh:mm AM/PM).
  dateOptions?: Intl.DateTimeFormatOptions;
  // Render date and time on one line ("date · time") instead of stacked.
  inline?: boolean;
}

// Renders a date with the time shown directly beneath it. Times are displayed in
// Kenyan time (EAT) because Date formatting is globally pinned to Africa/Nairobi
// (see src/lib/timezone.ts).
export function DateTime({
  value,
  className,
  timeClassName,
  emptyText = "—",
  dateOptions,
  inline = false,
}: DateTimeProps) {
  if (value === null || value === undefined || value === "") {
    return <span className={className}>{emptyText}</span>;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return <span className={className}>{emptyText}</span>;
  }

  const dateStr = d.toLocaleDateString(undefined, dateOptions);
  const timeStr = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (inline) {
    return (
      <span className={className} data-testid="text-datetime">
        {dateStr} · {timeStr}
      </span>
    );
  }

  return (
    <span className={className} data-testid="text-datetime">
      <span className="block">{dateStr}</span>
      <span className={timeClassName ?? "block text-[11px] text-muted-foreground"}>
        {timeStr}
      </span>
    </span>
  );
}

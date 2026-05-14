import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
  actions?: React.ReactNode;
}

function BackBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 text-primary hover:text-primary/70 active:scale-95 transition-all shrink-0 py-1 pl-0 pr-2 -ml-1 rounded-lg"
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      <span className="text-sm font-semibold">Back</span>
    </button>
  );
}

export function PageHeader({ title, subtitle, onBack, backHref, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 lg:static z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 py-2 lg:py-4 mb-3 lg:mb-5 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && <BackBtn onClick={onBack} />}
          {backHref && !onBack && (
            <Link href={backHref}>
              <BackBtn />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate lg:text-xl">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground leading-tight truncate lg:text-sm">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex gap-1.5 shrink-0 items-center lg:gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

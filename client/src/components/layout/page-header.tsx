import React from "react";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
  actions?: React.ReactNode;
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      className="flex items-center gap-1.5 h-10 px-3 -ml-1 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15 active:scale-95 transition-all shrink-0"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
      <span className="text-sm font-semibold hidden sm:inline">Back</span>
    </button>
  );
}

export function PageHeader({ title, subtitle, onBack, backHref, actions }: PageHeaderProps) {
  const showBack = !!(onBack || backHref);

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  }

  return (
    <div className="sticky top-0 lg:static z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 py-2 lg:py-4 mb-3 lg:mb-5 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && <BackBtn onClick={handleBack} />}
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

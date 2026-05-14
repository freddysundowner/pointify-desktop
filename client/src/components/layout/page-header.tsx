import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, onBack, backHref, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-14 lg:static z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 py-2 lg:py-5 mb-3 lg:mb-6 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 lg:gap-2 min-w-0">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0 flex-shrink-0 lg:h-9 lg:w-9">
              <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
            </Button>
          )}
          {backHref && !onBack && (
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 lg:h-9 lg:w-9">
                <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
              </Button>
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate lg:text-2xl lg:font-bold">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground leading-tight truncate lg:text-sm lg:mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex gap-1.5 flex-shrink-0 items-center lg:gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

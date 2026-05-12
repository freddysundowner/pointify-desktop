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
    <div className="sticky top-14 lg:static z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 py-2 mb-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {backHref && !onBack && (
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground leading-tight truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex gap-1.5 flex-shrink-0 items-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

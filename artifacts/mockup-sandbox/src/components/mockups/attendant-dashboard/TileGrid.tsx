import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Package, Users, BarChart3, DollarSign, Truck, 
  Receipt, TrendingUp, Wallet, UserCheck, ClipboardList, 
  Archive, RefreshCw, AlertTriangle, ChefHat, LogOut, 
  RefreshCcw, Lock, Clock, Store, ChevronRight
} from "lucide-react";
import { mockAttendant, mockShopName, buildActionGroups } from "./mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import "./_group.css";

export function TileGrid() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const icons = {
    ShoppingCart, Package, Users, BarChart3, DollarSign, Truck, Receipt,
    TrendingUp, Wallet, UserCheck, ClipboardList, Archive, RefreshCw,
    AlertTriangle, ChefHat,
  };

  const groups = buildActionGroups(icons);

  const activeGroups = groups.map(g => ({
    ...g,
    subActions: g.subActions.filter(sa => sa.enabled)
  })).filter(g => g.subActions.length > 0);

  const lockedGroups = groups.map(g => ({
    ...g,
    subActions: g.subActions.filter(sa => !sa.enabled)
  })).filter(g => g.subActions.length > 0);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-tight">{mockShopName}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                User: <span className="font-medium text-slate-700 dark:text-zinc-300">{mockAttendant.username}</span>
              </span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 font-mono tracking-wider ml-1">
                {mockAttendant.uniqueDigits}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 h-9 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" size="icon" className="sm:hidden h-9 w-9 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300">
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" className="hidden sm:flex gap-2 h-9">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
          <Button variant="default" size="icon" className="sm:hidden h-9 w-9">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col">
        
        {/* Active Tiles */}
        <div className="space-y-8 flex-1">
          {activeGroups.map((group) => (
            <section key={`active-${group.id}`} className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${group.color} shadow-sm`} />
                <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100 tracking-tight">{group.title}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {group.subActions.map((action) => (
                  <Card 
                    key={action.title} 
                    className="group cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 overflow-hidden relative active:scale-[0.98] shadow-sm"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${group.color} transition-all duration-300 group-hover:w-2`} />
                    <CardContent className="p-6 flex flex-col h-full gap-5 pl-7">
                      <div className="flex justify-between items-start">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm ring-1 ring-slate-100 dark:ring-zinc-800">
                          <action.icon className="w-7 h-7" strokeWidth={1.5} />
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-1.5 rounded-full text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-auto">
                        <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-lg leading-tight group-hover:text-primary transition-colors">{action.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 leading-snug">
                          {action.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
          
          {activeGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50">
              <Lock className="w-12 h-12 text-slate-300 dark:text-zinc-600 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">No Features Enabled</h2>
              <p className="text-slate-500 dark:text-zinc-400 max-w-sm mt-2">You don't have access to any active features. Please contact your manager to request access.</p>
            </div>
          )}
        </div>

        {/* Separator for locked section */}
        <div className="mt-16 mb-6">
          <div className="flex items-center gap-4">
            <Separator className="flex-1 bg-slate-200 dark:bg-zinc-800" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 bg-slate-50/50 dark:bg-zinc-950 px-2">
              <Lock className="w-3.5 h-3.5" />
              Restricted Access
            </span>
            <Separator className="flex-1 bg-slate-200 dark:bg-zinc-800" />
          </div>
        </div>

        {/* Locked Strip / Compact area */}
        <div className="flex flex-wrap gap-2.5 pb-8 justify-center sm:justify-start">
          {lockedGroups.flatMap((group) => 
            group.subActions.map((action) => (
              <div 
                key={`locked-${action.title}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 opacity-[0.65] hover:opacity-100 transition-opacity grayscale hover:grayscale-0 cursor-not-allowed group/locked shadow-sm"
                title={`Locked: ${action.title} (${group.title})`}
              >
                <action.icon className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-zinc-400 select-none">{action.title}</span>
                <Lock className="w-3 h-3 text-slate-300 dark:text-zinc-600 ml-0.5 group-hover/locked:text-red-400 transition-colors" />
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}

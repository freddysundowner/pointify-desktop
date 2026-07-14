import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Package, Users, BarChart3, DollarSign, Truck, Receipt,
  TrendingUp, Wallet, UserCheck, ClipboardList, Archive, RefreshCw,
  AlertTriangle, ChefHat, LogOut, Clock, Store, Lock, Key, ChevronRight, User, Shield
} from 'lucide-react';
import { mockAttendant, mockShopName, buildActionGroups, ActionGroup } from './mockData';
import './_group.css';

export function SidebarNav() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const icons = {
    ShoppingCart, Package, Users, BarChart3, DollarSign, Truck, Receipt,
    TrendingUp, Wallet, UserCheck, ClipboardList, Archive, RefreshCw,
    AlertTriangle, ChefHat
  };

  const groups = buildActionGroups(icons);
  const totalFeatures = groups.reduce((acc, group) => acc + group.subActions.length, 0);
  const availableFeatures = groups.reduce((acc, group) => acc + group.subActions.filter(a => a.enabled).length, 0);

  const firstEnabledGroup = groups.find(g => g.enabled) || groups[0];
  const [selectedGroupId, setSelectedGroupId] = useState(firstEnabledGroup.id);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  return (
    <div className="flex min-h-screen bg-zinc-100 font-sans text-slate-900 selection:bg-blue-200">
      {/* Sidebar / Nav Rail */}
      <aside className="w-72 bg-zinc-950 text-zinc-400 flex flex-col shadow-2xl z-10 shrink-0">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 text-white mb-1">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Pointify</h1>
          </div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mt-6 mb-2">Modules</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {groups.map(group => {
            const isSelected = group.id === selectedGroupId;
            const Icon = group.icon;
            
            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 text-left ${
                  isSelected 
                    ? 'bg-zinc-800 text-white shadow-inner' 
                    : 'hover:bg-zinc-900/50 hover:text-zinc-200'
                } ${!group.enabled && !isSelected ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isSelected ? group.color : 'bg-zinc-800 text-zinc-400'}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : ''}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{group.title}</div>
                    {isSelected && <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1 pr-2">{group.description}</div>}
                  </div>
                </div>
                {!group.enabled && (
                  <Lock className={`w-4 h-4 shrink-0 ${isSelected ? 'text-zinc-500' : 'text-zinc-600'}`} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/50 space-y-2">
          <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Sync Data
          </button>
          <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm z-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-800 tracking-tight">{mockShopName}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 font-medium">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> @{mockAttendant.username}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                <span>ID: {mockAttendant.uniqueDigits}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-zinc-700 font-semibold">
                <Shield className="w-4 h-4 text-emerald-500" />
                {availableFeatures} of {totalFeatures} features
              </div>
              <div className="text-xs text-zinc-400 font-medium mt-0.5">Permissions active</div>
            </div>
            
            <div className="h-10 w-px bg-zinc-200"></div>
            
            <div className="flex flex-col items-end w-28">
              <div className="text-lg font-bold text-zinc-800 tracking-tight tabular-nums">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl text-white shadow-sm ${selectedGroup.color}`}>
                  <selectedGroup.icon className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">{selectedGroup.title}</h3>
              </div>
              <p className="text-zinc-500 text-lg ml-11">{selectedGroup.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedGroup.subActions.map((action, idx) => {
                const ActionIcon = action.icon;
                const isEnabled = action.enabled;

                return (
                  <button
                    key={idx}
                    disabled={!isEnabled}
                    className={`group relative flex flex-col text-left p-6 rounded-2xl border transition-all duration-200 ${
                      isEnabled 
                        ? 'bg-white border-zinc-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' 
                        : 'bg-zinc-100/50 border-zinc-200/50 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${
                        isEnabled ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors' : 'bg-zinc-200/50 text-zinc-400'
                      }`}>
                        <ActionIcon className="w-6 h-6" />
                      </div>
                      {!isEnabled && (
                        <div className="bg-zinc-200/80 px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                          <Lock className="w-3 h-3" />
                          Locked
                        </div>
                      )}
                    </div>
                    
                    <h4 className={`text-lg font-bold mb-1.5 ${isEnabled ? 'text-zinc-900' : 'text-zinc-500'}`}>
                      {action.title}
                    </h4>
                    <p className={`text-sm leading-relaxed ${isEnabled ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {action.description}
                    </p>

                    {isEnabled && (
                      <div className="mt-4 flex items-center text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200">
                        Open Feature <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {!selectedGroup.enabled && selectedGroup.subActions.every(a => !a.enabled) && (
              <div className="mt-12 text-center max-w-sm mx-auto">
                <div className="w-16 h-16 bg-zinc-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-zinc-400" />
                </div>
                <h4 className="text-zinc-900 font-bold text-lg mb-2">Module Locked</h4>
                <p className="text-zinc-500 text-sm">
                  You do not have permission to access any features in {selectedGroup.title}. 
                  Contact your manager to request access.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

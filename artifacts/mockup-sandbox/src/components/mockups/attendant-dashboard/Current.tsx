import './_group.css';
import { useState } from 'react';
import {
  Store, Clock, LogOut, ShoppingCart, Package, Users, BarChart3, DollarSign,
  Settings, Truck, Receipt, TrendingUp, Wallet, UserCheck, ClipboardList,
  Archive, RefreshCw, Lock, AlertTriangle, ChefHat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { mockAttendant, mockShopName, buildActionGroups } from './mockData';

const icons = {
  ShoppingCart, Package, Users, BarChart3, DollarSign, Truck, Receipt,
  TrendingUp, Wallet, UserCheck, ClipboardList, Archive, RefreshCw,
  AlertTriangle, ChefHat,
};

export function Current() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('sales');
  const currentTime = new Date('2026-07-14T09:15:00');
  const attendant = mockAttendant;
  const shopName = mockShopName;

  const actionGroups = buildActionGroups(icons);
  const availableGroups = actionGroups.filter((group) =>
    group.subActions.some((sub) => sub.enabled)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Staff Dashboard</h1>
                <p className="text-sm text-gray-500">{shopName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{attendant.username}</p>
                <p className="text-xs text-gray-500">PIN: {attendant.uniqueDigits}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {attendant.username}!
          </h2>
          <p className="text-gray-600">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Feature Groups - Expandable cards */}
        <div className="space-y-6 mb-8">
          {availableGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div
                className={`p-6 cursor-pointer transition-all duration-200 ${
                  group.enabled ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-60'
                }`}
                onClick={() => {
                  if (group.enabled) {
                    setExpandedGroup(expandedGroup === group.id ? null : group.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                      group.enabled ? group.color : 'bg-gray-300'
                    }`}>
                      {group.enabled ? (
                        <group.icon className="h-6 w-6 text-white" />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${group.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                        {group.title}
                      </h3>
                      <p className={`text-sm ${group.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {group.enabled && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {group.subActions.filter((sub) => sub.enabled).length} of {group.subActions.length} available
                        </p>
                      </div>
                    )}

                    {group.enabled ? (
                      <div className={`transition-transform duration-200 ${expandedGroup === group.id ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    ) : (
                      <span className="inline-block bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full">
                        No Access
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {expandedGroup === group.id && group.enabled && (
                <div className="border-t bg-gray-50 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.subActions.filter((sub) => sub.enabled).map((subAction, subIndex) => (
                      <div
                        key={subIndex}
                        className="bg-white rounded-lg border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-300"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${group.color}`}>
                            <subAction.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">{subAction.title}</h4>
                            <p className="text-xs mt-1 text-gray-600">{subAction.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Permission Status Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Permission Status</h3>
              <p className="text-sm text-blue-700">
                You have access to {availableGroups.filter((g) => g.enabled).length} of {availableGroups.length} feature groups
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((availableGroups.filter((g) => g.enabled).length / availableGroups.length) * 100)}%
              </div>
              <p className="text-xs text-blue-600">Access Level</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

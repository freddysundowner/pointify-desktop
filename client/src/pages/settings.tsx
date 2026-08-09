import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Globe, CheckCircle2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/features/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { rawApiFetch } from "@/lib/api-config";

export default function SettingsPage() {
  const { admin } = useAuth();
  const { toast } = useToast();
  const [selectedMode, setSelectedMode] = useState<'online' | 'offline' | 'hybrid'>('hybrid');

  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings', admin?._id],
    queryFn: async () => {
      const response = await rawApiFetch(`/api/settings?adminId=${admin?._id}`, { auth: 'admin-first' });
      return response.json();
    },
    enabled: !!admin?._id,
  });

  useEffect(() => {
    if (settingsData?.success && settingsData?.data) {
      setSelectedMode(settingsData.data.apiMode || 'hybrid');
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (apiMode: 'online' | 'offline' | 'hybrid') => {
      const response = await rawApiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin?._id, apiMode }),
        auth: 'admin-first',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update settings');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Settings Updated",
        description: data.message || `API mode set to ${data.data?.apiMode}`,
      });
      queryClient.invalidateQueries({ queryKey: ['settings', admin?._id] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const currentSettings = settingsData?.data;
  const isUpdating = updateSettingsMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="System configuration and status" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Mode */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">API Mode Configuration</CardTitle>
              </div>
              <CardDescription>
                Choose how the system handles API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={selectedMode} onValueChange={(v) => setSelectedMode(v as typeof selectedMode)}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="font-medium">Online Mode</div>
                          <div className="text-sm text-gray-500">Always use online API, no local fallback</div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="offline" id="offline" />
                    <Label htmlFor="offline" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <WifiOff className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="font-medium">Offline Mode</div>
                          <div className="text-sm text-gray-500">Use local API only, no online calls</div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="hybrid" id="hybrid" />
                    <Label htmlFor="hybrid" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="font-medium">Hybrid Mode</div>
                          <div className="text-sm text-gray-500">Online first with automatic local fallback</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              <Button
                onClick={() => updateSettingsMutation.mutate(selectedMode)}
                disabled={isUpdating || isLoadingSettings}
                className="w-full"
              >
                {isUpdating ? "Updating..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">Current Status</CardTitle>
              </div>
              <CardDescription>Active system configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-900">
                          {currentSettings?.apiMode === 'online' ? 'Online Mode' :
                           currentSettings?.apiMode === 'offline' ? 'Offline Mode' : 'Hybrid Mode'}
                        </div>
                        <div className="text-sm text-blue-700">
                          {currentSettings?.apiMode === 'online' ? 'Direct online API only' :
                           currentSettings?.apiMode === 'offline' ? 'Local API only' : 'Online with local fallback'}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Active</Badge>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <strong>Current Mode: </strong>
                    {currentSettings?.apiMode === 'online'
                      ? 'All API calls go directly to the online server.'
                      : currentSettings?.apiMode === 'offline'
                      ? 'All API calls use the local server only.'
                      : 'System tries online API first, falls back to local on network errors.'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

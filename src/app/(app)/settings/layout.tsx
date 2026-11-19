

'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, DatabaseZap, UserCog } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    if (pathname.includes('/settings/users')) {
      return 'users';
    }
    if (pathname.includes('/settings/maintenance')) {
      return 'maintenance';
    }
    return 'general';
  };
  
  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    let path = '/settings';
    if (value !== 'general') {
        path += `/${value}`;
    }
    router.push(path);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Configuración</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
            <TabsTrigger value="general">
                <Settings className="mr-2 h-4 w-4" />
                General
            </TabsTrigger>
             <TabsTrigger value="users">
                <UserCog className="mr-2 h-4 w-4" />
                Usuarios y Permisos
            </TabsTrigger>
            <TabsTrigger value="maintenance">
                <DatabaseZap className="mr-2 h-4 w-4" />
                Mantenimiento
            </TabsTrigger>
        </TabsList>
      </Tabs>
      
      {children}
    </div>
  );
}

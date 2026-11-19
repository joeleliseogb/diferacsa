
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Calculator, Bell } from 'lucide-react';
import { MainNav } from '@/components/main-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from "@/components/ui/toaster";
import { ClientOnly } from '@/components/client-only';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AdvancedCalculator } from '@/components/advanced-calculator';
import { NotificationsPanel } from '@/components/notifications-panel';

/**
 * Define el layout principal de la aplicación, incluyendo la barra lateral y la cabecera.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Los componentes hijos que se renderizarán dentro del layout.
 * @returns {JSX.Element} El componente del layout de la aplicación.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSpecialView = pathname.startsWith('/tpv');
  const isSidebarDefaultOpen = !isSpecialView;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ClientOnly>
        <SidebarProvider defaultOpen={isSidebarDefaultOpen}>
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground font-bold text-xl font-headline rounded-md">
                  S
                </div>
                <h1 className="text-xl font-headline font-semibold group-data-[collapsible=icon]:hidden">SimplyGest</h1>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
            <SidebarFooter>
              <div className="flex items-center justify-between p-2 m-2 bg-black/10 rounded-lg group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" alt="Admin" data-ai-hint="user avatar" />
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Usuario Admin</span>
                    <span className="text-xs text-muted-foreground">admin@simplygest.com</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <div className="flex flex-col h-svh">
               <header className="sticky top-0 z-20 p-2 flex items-center justify-between bg-transparent backdrop-blur-sm">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Calculator className="h-5 w-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm p-0 border-0 bg-transparent shadow-none">
                            <AdvancedCalculator />
                        </DialogContent>
                      </Dialog>
                      <NotificationsPanel />
                      <ThemeToggle />
                    </div>
               </header>
               <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-0">
                {children}
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ClientOnly>
      <Toaster />
    </ThemeProvider>
  );
}

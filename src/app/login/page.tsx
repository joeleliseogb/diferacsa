'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Mail, KeyRound, ArrowRight, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { getUsers, type User } from '@/lib/user-service';

export default function LoginPage() {
  const { user, loginWithPassword, loginWithPin, loginAsDemoUser } = useAuth();
  const router = useRouter();

  // Estados del formulario
  const [emailOrName, setEmailOrName] = useState('admin@simplygest.com');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('1');
  const [pin, setPin] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Si ya está logueado, redirigir al dashboard
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Cargar usuarios disponibles para el selector de PIN
  useEffect(() => {
    async function load() {
      const u = await getUsers();
      setAvailableUsers(u);
    }
    load();
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoadingAction(true);
    const success = await loginWithPassword(emailOrName, password);
    setLoadingAction(false);
    if (!success) {
      setErrorMsg('Usuario o contraseña incorrectos. (Prueba: admin / admin)');
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoadingAction(true);
    const success = await loginWithPin(selectedUserId, pin);
    setLoadingAction(false);
    if (!success) {
      setErrorMsg('El PIN ingresado es incorrecto.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F6F9] dark:bg-background relative overflow-hidden">
      {/* Luces de fondo sutiles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#1E2538]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Cabecera y Branding Diferacsa */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-[#1E2538] text-white font-black text-2xl shadow-md mb-1">
            D
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground font-headline">
            Difer<span className="text-[#EE5937]">acsa</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Sistema de Gestión Integral & Punto de Venta
          </p>
        </div>

        {/* Tarjeta de Inicio de Sesión */}
        <Card className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-xl">
          <Tabs defaultValue="password" className="space-y-5">
            <TabsList className="w-full grid grid-cols-2 bg-muted/60 p-1 rounded-full h-10">
              <TabsTrigger value="password" className="rounded-full text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Contraseña
              </TabsTrigger>
              <TabsTrigger value="pin" className="rounded-full text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                PIN de Cajero
              </TabsTrigger>
            </TabsList>

            {/* Error banner si falla */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Formulario 1: Correo y Contraseña */}
            <TabsContent value="password" className="space-y-4 m-0">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Usuario o Correo</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="admin@simplygest.com o admin"
                      value={emailOrName}
                      onChange={(e) => setEmailOrName(e.target.value)}
                      className="pl-10 h-10 text-xs rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Contraseña</Label>
                    <span className="text-[11px] text-muted-foreground font-medium cursor-pointer hover:underline">
                      Default: admin
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-10 text-xs rounded-xl font-mono"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loadingAction}
                  className="w-full h-11 rounded-full bg-[#1E2538] hover:bg-[#151B28] text-white font-bold text-xs shadow-sm gap-2 transition-transform active:scale-98"
                >
                  <span>{loadingAction ? 'Verificando...' : 'Iniciar Sesión'}</span>
                  <ArrowRight className="h-4 w-4 text-[#EE5937]" />
                </Button>
              </form>
            </TabsContent>

            {/* Formulario 2: Acceso Rápido con PIN */}
            <TabsContent value="pin" className="space-y-4 m-0">
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Seleccionar Operador / Cajero</Label>
                  <select 
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      const sel = availableUsers.find(u => u.id === e.target.value);
                      if (sel?.pin) setPin(sel.pin);
                    }}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-input/80 bg-card text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">PIN de 4 Dígitos</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password"
                      maxLength={4}
                      placeholder="1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="pl-10 h-10 text-center tracking-[0.5em] font-mono text-base font-bold rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loadingAction}
                  className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm gap-2 transition-transform active:scale-98"
                >
                  <span>{loadingAction ? 'Verificando PIN...' : 'Acceso Rápido a Caja'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Accesos Rápidos de Demostración (1 Clic) */}
        <div className="rounded-3xl border border-border/70 bg-card/60 p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Ingreso rápido para pruebas (Cambia de rol en 1 clic):</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => loginAsDemoUser({ id: '1', name: 'Joel Eliseo', email: 'admin@simplygest.com', role: 'Admin' })}
              className="p-2.5 rounded-2xl border border-border/80 bg-card hover:border-primary/60 hover:bg-orange-50/30 text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                <strong className="text-xs text-foreground block">Admin Total</strong>
              </div>
              <span className="text-[10px] text-muted-foreground">Acceso a todo el sistema</span>
            </button>

            <button
              onClick={() => loginAsDemoUser({ id: '9', name: 'Sofia Cobros', email: 'sofia.caja@simplygest.com', role: 'Cajero' })}
              className="p-2.5 rounded-2xl border border-border/80 bg-card hover:border-sky-500/60 hover:bg-sky-50/30 text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500 inline-block" />
                <strong className="text-xs text-foreground block">Cajero TPV</strong>
              </div>
              <span className="text-[10px] text-muted-foreground">Punto de venta y caja</span>
            </button>

            <button
              onClick={() => loginAsDemoUser({ id: '2', name: 'Ana Ventas', email: 'ana.ventas@simplygest.com', role: 'Vendedor' })}
              className="p-2.5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/60 hover:bg-emerald-50/30 text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                <strong className="text-xs text-foreground block">Vendedor</strong>
              </div>
              <span className="text-[10px] text-muted-foreground">Pedidos y presupuestos</span>
            </button>

            <button
              onClick={() => loginAsDemoUser({ id: '12', name: 'Roberto Almacén', email: 'jefe.bodega@simplygest.com', role: 'Jefe de Bodega' })}
              className="p-2.5 rounded-2xl border border-border/80 bg-card hover:border-amber-500/60 hover:bg-amber-50/30 text-left transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                <strong className="text-xs text-foreground block">Jefe de Bodega</strong>
              </div>
              <span className="text-[10px] text-muted-foreground">Inventario y traslados</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

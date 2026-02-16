import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Banknote,
  Bitcoin,
  Plus,
  Trash2,
  ExternalLink,
  Package,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  Save,
  Pause,
  Play,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SuperAdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workshops } = useQuery({
    queryKey: ["sa_workshops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workshops").select("*, plans(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["sa_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentRequests } = useQuery({
    queryKey: ["sa_payment_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_requests").select("*, workshops(name, whatsapp), plans(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["sa_payment_methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pendingRequests = paymentRequests?.filter((r) => r.status === "pending") || [];
  const activeWorkshops = workshops?.filter((w) => w.is_active) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="bg-secondary w-full justify-start overflow-x-auto">
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="workshops" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Talleres
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <Package className="h-4 w-4" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Pagos
            {pendingRequests.length > 0 && (
              <Badge className="ml-1 bg-yellow-500 text-black text-[10px] px-1.5">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="gap-1.5">
            <Banknote className="h-4 w-4" />
            Config Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <StatsTab workshops={workshops || []} activeWorkshops={activeWorkshops} platformSettings={platformSettings} />
        </TabsContent>
        <TabsContent value="workshops">
          <WorkshopsTab workshops={workshops || []} plans={plans || []} />
        </TabsContent>
        <TabsContent value="plans">
          <PlansTab plans={plans || []} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab requests={paymentRequests || []} />
        </TabsContent>
        <TabsContent value="payment-methods">
          <PaymentMethodsTab methods={paymentMethods || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Stats Tab ---
function StatsTab({ workshops, activeWorkshops, platformSettings }: { workshops: any[]; activeWorkshops: any[]; platformSettings: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [platformName, setPlatformName] = useState(platformSettings?.platform_name || "RepairControl");

  useEffect(() => {
    if (platformSettings?.platform_name) setPlatformName(platformSettings.platform_name);
  }, [platformSettings?.platform_name]);

  const updatePlatformName = useMutation({
    mutationFn: async (name: string) => {
      if (!platformSettings?.id) return;
      const { error } = await supabase.from("platform_settings").update({ platform_name: name }).eq("id", platformSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_settings"] });
      setEditingName(false);
      toast({ title: "Nombre de plataforma actualizado" });
    },
  });

  const trialWorkshops = workshops.filter(w => w.subscription_status === "trial");
  const expiredWorkshops = workshops.filter(w => w.subscription_status === "expired");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground">Estadísticas Globales</h2>
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="w-48 h-9" placeholder="Nombre de la plataforma" />
            <Button size="sm" onClick={() => updatePlatformName.mutate(platformName)}><Save className="h-4 w-4 mr-1" /> Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingName(false); setPlatformName(platformSettings?.platform_name || "RepairControl"); }}>Cancelar</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditingName(true)}>
            <Edit className="h-4 w-4 mr-1.5" />
            Nombre: {platformSettings?.platform_name || "RepairControl"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Talleres</p>
              <p className="text-3xl font-bold mt-1">{workshops.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-cyan-400" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-3xl font-bold mt-1">{activeWorkshops.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En Prueba</p>
              <p className="text-3xl font-bold mt-1">{trialWorkshops.length}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expirados</p>
              <p className="text-3xl font-bold mt-1">{expiredWorkshops.length}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Workshops Tab (FULL EDIT) ---
function WorkshopsTab({ workshops, plans }: { workshops: any[]; plans: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingWs, setEditingWs] = useState<any>(null);

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    trial: "bg-blue-500/20 text-blue-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    expired: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
    paused: "bg-orange-500/20 text-orange-400",
  };
  const statusLabels: Record<string, string> = {
    active: "Activo",
    trial: "Prueba",
    pending: "Pendiente",
    expired: "Expirado",
    cancelled: "Cancelado",
    paused: "Pausado",
  };

  const updateWorkshop = useMutation({
    mutationFn: async (ws: any) => {
      const { error } = await supabase.from("workshops").update({
        name: ws.name,
        phone: ws.phone,
        whatsapp: ws.whatsapp,
        email: ws.email,
        address: ws.address,
        plan_id: ws.plan_id || null,
        subscription_status: ws.subscription_status,
        is_active: ws.is_active,
      }).eq("id", ws.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_workshops"] });
      setEditingWs(null);
      toast({ title: "Taller actualizado" });
    },
  });

  const togglePause = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "paused" ? "active" : "paused";
      const isActive = newStatus !== "paused";
      const { error } = await supabase.from("workshops").update({
        subscription_status: newStatus,
        is_active: isActive,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_workshops"] });
      toast({ title: "Estado del taller actualizado" });
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Talleres Registrados</h2>
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taller</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workshops.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell>
                    <p className="font-medium">{ws.name}</p>
                    {ws.email && <p className="text-xs text-muted-foreground">{ws.email}</p>}
                  </TableCell>
                  <TableCell>
                    {ws.whatsapp && (
                      <a href={`https://wa.me/${ws.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-green-400 hover:underline flex items-center gap-1 text-sm">
                        {ws.whatsapp} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {ws.phone && !ws.whatsapp && <p className="text-sm">{ws.phone}</p>}
                  </TableCell>
                  <TableCell>{ws.plans?.name || "Sin plan"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[ws.subscription_status] || ""}>{statusLabels[ws.subscription_status] || ws.subscription_status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(ws.created_at), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingWs({ ...ws })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePause.mutate({ id: ws.id, currentStatus: ws.subscription_status })}
                        title={ws.subscription_status === "paused" ? "Reactivar" : "Pausar"}
                      >
                        {ws.subscription_status === "paused" ? <Play className="h-4 w-4 text-green-400" /> : <Pause className="h-4 w-4 text-orange-400" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workshops.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay talleres registrados aún</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Workshop Dialog */}
      <Dialog open={!!editingWs} onOpenChange={(open) => !open && setEditingWs(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Taller</DialogTitle>
            <DialogDescription>Modifica todos los datos del taller</DialogDescription>
          </DialogHeader>
          {editingWs && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del taller</Label>
                <Input value={editingWs.name} onChange={(e) => setEditingWs({ ...editingWs, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editingWs.email || ""} onChange={(e) => setEditingWs({ ...editingWs, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={editingWs.phone || ""} onChange={(e) => setEditingWs({ ...editingWs, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={editingWs.whatsapp || ""} onChange={(e) => setEditingWs({ ...editingWs, whatsapp: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input value={editingWs.address || ""} onChange={(e) => setEditingWs({ ...editingWs, address: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={editingWs.plan_id || "none"} onValueChange={(v) => setEditingWs({ ...editingWs, plan_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin plan</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado suscripción</Label>
                  <Select value={editingWs.subscription_status} onValueChange={(v) => setEditingWs({ ...editingWs, subscription_status: v, is_active: v === "active" || v === "trial" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="trial">Prueba</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="expired">Expirado</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingWs.is_active} onCheckedChange={(v) => setEditingWs({ ...editingWs, is_active: v })} />
                <Label>Taller activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWs(null)}>Cancelar</Button>
            <Button onClick={() => updateWorkshop.mutate(editingWs)}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Plans Tab (FULL EDIT with features) ---
function PlansTab({ plans }: { plans: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [newFeature, setNewFeature] = useState("");

  const updatePlan = useMutation({
    mutationFn: async (plan: any) => {
      const { error } = await supabase.from("plans").update({
        name: plan.name,
        description: plan.description,
        monthly_price: plan.monthly_price,
        annual_price: plan.annual_price,
        has_free_trial: plan.has_free_trial,
        trial_days: plan.trial_days,
        features: plan.features,
        currency: plan.currency || "NIO",
      }).eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_plans"] });
      queryClient.invalidateQueries({ queryKey: ["public_plans"] });
      setEditingPlan(null);
      toast({ title: "Plan actualizado" });
    },
  });

  const addFeature = () => {
    if (!newFeature.trim() || !editingPlan) return;
    const features = [...(editingPlan.features || []), newFeature.trim()];
    setEditingPlan({ ...editingPlan, features });
    setNewFeature("");
  };

  const removeFeature = (index: number) => {
    if (!editingPlan) return;
    const features = [...(editingPlan.features || [])];
    features.splice(index, 1);
    setEditingPlan({ ...editingPlan, features });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Gestión de Planes</h2>
      <p className="text-sm text-muted-foreground">Edita nombres, descripciones, precios y características de cada plan</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="glass-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <Badge className="bg-green-500/20 text-green-400">Activo</Badge>
              </div>
              <div>
                <span className="text-3xl font-extrabold">{plan.currency === "USD" ? "$" : "C$"}{plan.monthly_price}</span>
                <span className="text-sm text-muted-foreground ml-1">{plan.currency || "NIO"}/mes</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              {plan.has_free_trial && (
                <p className="text-xs text-cyan-400">Prueba gratis: {plan.trial_days} días</p>
              )}
              {/* Features list */}
              {((plan.features as string[]) || []).length > 0 && (
                <ul className="space-y-1">
                  {((plan.features as string[]) || []).map((f: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" className="w-full" onClick={() => setEditingPlan({ ...plan, features: plan.features || [] })}>
                <Edit className="h-4 w-4 mr-1.5" /> Editar todo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plan</DialogTitle>
            <DialogDescription>Modifica nombre, descripción, precios y características</DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del plan</Label>
                <Input value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={editingPlan.description || ""} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={editingPlan.currency || "NIO"} onValueChange={(v) => setEditingPlan({ ...editingPlan, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIO">Córdobas (C$)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Precio mensual ({editingPlan.currency === "USD" ? "$" : "C$"})</Label>
                  <Input type="number" value={editingPlan.monthly_price} onChange={(e) => setEditingPlan({ ...editingPlan, monthly_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Precio anual ({editingPlan.currency === "USD" ? "$" : "C$"})</Label>
                  <Input type="number" value={editingPlan.annual_price} onChange={(e) => setEditingPlan({ ...editingPlan, annual_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={editingPlan.has_free_trial || false} onCheckedChange={(v) => setEditingPlan({ ...editingPlan, has_free_trial: v })} />
                  <Label>Prueba gratis</Label>
                </div>
                {editingPlan.has_free_trial && (
                  <div className="space-y-2">
                    <Label>Días de prueba</Label>
                    <Input type="number" value={editingPlan.trial_days || 0} onChange={(e) => setEditingPlan({ ...editingPlan, trial_days: parseInt(e.target.value) || 0 })} />
                  </div>
                )}
              </div>

              {/* Features editor */}
              <div className="space-y-2">
                <Label>Características del plan</Label>
                <div className="space-y-2">
                  {((editingPlan.features as string[]) || []).map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={f} onChange={(e) => {
                        const features = [...editingPlan.features];
                        features[i] = e.target.value;
                        setEditingPlan({ ...editingPlan, features });
                      }} className="flex-1" />
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFeature(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Nueva característica..." value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFeature()} className="flex-1" />
                  <Button size="sm" variant="outline" onClick={addFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancelar</Button>
            <Button onClick={() => updatePlan.mutate(editingPlan)}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Payments Tab ---
function PaymentsTab({ requests }: { requests: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const reviewPayment = useMutation({
    mutationFn: async ({ id, status, workshopId }: { id: string; status: "approved" | "rejected"; workshopId: string }) => {
      const { error } = await supabase.from("payment_requests").update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      }).eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        await supabase.from("workshops").update({
          is_active: true,
          subscription_status: "active",
          subscription_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        }).eq("id", workshopId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_payment_requests"] });
      queryClient.invalidateQueries({ queryKey: ["sa_workshops"] });
      toast({ title: "Pago procesado" });
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Pagos Recibidos</h2>
        <p className="text-sm text-muted-foreground">Revisa comprobantes y aprueba pagos para activar talleres</p>
      </div>
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taller</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.workshops?.name}
                    {req.workshops?.whatsapp && (
                      <a href={`https://wa.me/${req.workshops.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="block text-xs text-green-400 hover:underline">
                        WhatsApp
                      </a>
                    )}
                  </TableCell>
                  <TableCell>{req.plans?.name}</TableCell>
                  <TableCell>{req.currency} {req.amount}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[req.status]}>{req.status === "pending" ? "Pendiente" : req.status === "approved" ? "Aprobado" : "Rechazado"}</Badge>
                  </TableCell>
                  <TableCell>
                    {req.receipt_url && (
                      <a href={req.receipt_url} target="_blank" rel="noopener">
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(req.created_at), "dd/MM/yy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    {req.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => reviewPayment.mutate({ id: req.id, status: "approved", workshopId: req.workshop_id })}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewPayment.mutate({ id: req.id, status: "rejected", workshopId: req.workshop_id })}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay pagos registrados aún.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Payment Methods Tab ---
function PaymentMethodsTab({ methods }: { methods: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [newMethod, setNewMethod] = useState({ type: "bank_transfer", label: "", bank_name: "", account_number: "", account_holder: "", binance_id: "", instructions: "" });

  const addMethod = useMutation({
    mutationFn: async (method: any) => {
      const { error } = await supabase.from("payment_methods").insert(method);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_payment_methods"] });
      setShowAdd(false);
      setNewMethod({ type: "bank_transfer", label: "", bank_name: "", account_number: "", account_holder: "", binance_id: "", instructions: "" });
      toast({ title: "Método de pago agregado" });
    },
  });

  const updateMethod = useMutation({
    mutationFn: async (method: any) => {
      const { error } = await supabase.from("payment_methods").update({
        label: method.label,
        bank_name: method.bank_name,
        account_number: method.account_number,
        account_holder: method.account_holder,
        binance_id: method.binance_id,
        instructions: method.instructions,
      }).eq("id", method.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_payment_methods"] });
      setEditingMethod(null);
      toast({ title: "Método actualizado" });
    },
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa_payment_methods"] });
      toast({ title: "Método eliminado" });
    },
  });

  const renderForm = (method: any, setMethod: (m: any) => void, onSave: () => void, onCancel: () => void) => (
    <Card className="glass-card border-cyan-500/30">
      <CardContent className="p-5 space-y-3">
        {!editingMethod && (
          <Select value={method.type} onValueChange={(v) => setMethod({ ...method, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
              <SelectItem value="binance">Binance USDT</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Input placeholder="Nombre (ej: BAC, Banpro, Binance)" value={method.label} onChange={(e) => setMethod({ ...method, label: e.target.value })} />
        {method.type === "bank_transfer" ? (
          <>
            <Input placeholder="Nombre del banco" value={method.bank_name || ""} onChange={(e) => setMethod({ ...method, bank_name: e.target.value })} />
            <Input placeholder="Número de cuenta" value={method.account_number || ""} onChange={(e) => setMethod({ ...method, account_number: e.target.value })} />
            <Input placeholder="Titular de la cuenta" value={method.account_holder || ""} onChange={(e) => setMethod({ ...method, account_holder: e.target.value })} />
          </>
        ) : (
          <Input placeholder="Binance ID" value={method.binance_id || ""} onChange={(e) => setMethod({ ...method, binance_id: e.target.value })} />
        )}
        <Textarea placeholder="Instrucciones adicionales" value={method.instructions || ""} onChange={(e) => setMethod({ ...method, instructions: e.target.value })} />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave}>Guardar</Button>
          <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Métodos de Pago</h2>
          <p className="text-sm text-muted-foreground">Configura los datos bancarios y Binance que verán los talleres para pagar</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1.5" /> Agregar
        </Button>
      </div>

      {showAdd && renderForm(newMethod, setNewMethod, () => addMethod.mutate(newMethod), () => setShowAdd(false))}

      {methods.map((m) => (
        editingMethod?.id === m.id ? (
          renderForm(editingMethod, setEditingMethod, () => updateMethod.mutate(editingMethod), () => setEditingMethod(null))
        ) : (
          <Card key={m.id} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {m.type === "bank_transfer" ? <Banknote className="h-6 w-6 text-green-400" /> : <Bitcoin className="h-6 w-6 text-yellow-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{m.label}</p>
                      <Badge className="bg-green-500/20 text-green-400">Activo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {m.type === "bank_transfer" ? `${m.bank_name} · ${m.account_number}` : `ID: ${m.binance_id}`}
                    </p>
                    {m.account_holder && <p className="text-xs text-muted-foreground">Titular: {m.account_holder}</p>}
                    {m.instructions && <p className="text-xs text-muted-foreground italic mt-1">{m.instructions}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingMethod({ ...m })}>
                  <Edit className="h-4 w-4 mr-1.5" /> Editar
                </Button>
                <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => deleteMethod.mutate(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ))}

      {methods.length === 0 && !showAdd && (
        <Card className="glass-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay métodos de pago configurados
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SuperAdminDashboard;

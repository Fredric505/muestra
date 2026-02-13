import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  CreditCard,
  Package,
  Users,
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SuperAdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
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

  const pendingRequests = paymentRequests?.filter((r) => r.status === "pending") || [];
  const activeWorkshops = workshops?.filter((w) => w.is_active) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Panel Super Admin</h1>
        <p className="text-muted-foreground">Gestión de talleres, planes y pagos de RepairControl</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold">{workshops?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Talleres totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{activeWorkshops.length}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-xs text-muted-foreground">Pagos pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{plans?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Planes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workshops" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="workshops">Talleres</TabsTrigger>
          <TabsTrigger value="payments">
            Pagos
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-black">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="payment-methods">Métodos de Pago</TabsTrigger>
        </TabsList>

        {/* Workshops Tab */}
        <TabsContent value="workshops">
          <WorkshopsTab workshops={workshops || []} />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <PaymentsTab requests={paymentRequests || []} />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <PlansTab plans={plans || []} />
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods">
          <PaymentMethodsTab methods={paymentMethods || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Sub components ---

function WorkshopsTab({ workshops }: { workshops: any[] }) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    trial: "bg-blue-500/20 text-blue-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    expired: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };
  const statusLabels: Record<string, string> = {
    active: "Activo",
    trial: "Prueba",
    pending: "Pendiente",
    expired: "Expirado",
    cancelled: "Cancelado",
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Talleres Registrados</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Taller</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workshops.map((ws) => (
              <TableRow key={ws.id}>
                <TableCell className="font-medium">{ws.name}</TableCell>
                <TableCell>
                  {ws.whatsapp && (
                    <a href={`https://wa.me/${ws.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-green-400 hover:underline flex items-center gap-1">
                      {ws.whatsapp} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </TableCell>
                <TableCell>{ws.plans?.name || "Sin plan"}</TableCell>
                <TableCell>
                  <Badge className={statusColors[ws.subscription_status] || ""}>{statusLabels[ws.subscription_status] || ws.subscription_status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(ws.created_at), "dd/MM/yyyy", { locale: es })}
                </TableCell>
              </TableRow>
            ))}
            {workshops.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay talleres registrados aún</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Solicitudes de Pago</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Taller</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Comprobante</TableHead>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay solicitudes de pago</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlansTab({ plans }: { plans: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const updatePlan = useMutation({
    mutationFn: async (plan: any) => {
      const { error } = await supabase.from("plans").update({
        name: plan.name,
        description: plan.description,
        monthly_price: plan.monthly_price,
        annual_price: plan.annual_price,
        has_free_trial: plan.has_free_trial,
        trial_days: plan.trial_days,
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

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Gestión de Planes</CardTitle>
        <CardDescription>Edita los precios y descripciones que aparecen en la portada</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-secondary/50 border-border">
            <CardContent className="p-4">
              {editingPlan?.id === plan.id ? (
                <div className="space-y-3">
                  <Input value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} placeholder="Nombre" />
                  <Textarea value={editingPlan.description} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} placeholder="Descripción" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Precio mensual (C$)</Label>
                      <Input type="number" value={editingPlan.monthly_price} onChange={(e) => setEditingPlan({ ...editingPlan, monthly_price: parseFloat(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Precio anual (C$)</Label>
                      <Input type="number" value={editingPlan.annual_price} onChange={(e) => setEditingPlan({ ...editingPlan, annual_price: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updatePlan.mutate(editingPlan)}>Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm">{plan.description}</p>
                    <p className="text-sm mt-1">
                      C${plan.monthly_price}/mes · C${plan.annual_price}/año
                      {plan.has_free_trial && <span className="text-cyan-400 ml-2">({plan.trial_days} días gratis)</span>}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingPlan({ ...plan })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentMethodsTab({ methods }: { methods: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
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

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Métodos de Pago</CardTitle>
          <CardDescription>Configura las formas de pago que aceptas</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Agregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <Card className="bg-secondary/50 border-cyan-500/30">
            <CardContent className="p-4 space-y-3">
              <Select value={newMethod.type} onValueChange={(v) => setNewMethod({ ...newMethod, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                  <SelectItem value="binance">Binance USDT</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Nombre (ej: BAC, Banpro, Binance)" value={newMethod.label} onChange={(e) => setNewMethod({ ...newMethod, label: e.target.value })} />
              {newMethod.type === "bank_transfer" ? (
                <>
                  <Input placeholder="Nombre del banco" value={newMethod.bank_name} onChange={(e) => setNewMethod({ ...newMethod, bank_name: e.target.value })} />
                  <Input placeholder="Número de cuenta" value={newMethod.account_number} onChange={(e) => setNewMethod({ ...newMethod, account_number: e.target.value })} />
                  <Input placeholder="Titular de la cuenta" value={newMethod.account_holder} onChange={(e) => setNewMethod({ ...newMethod, account_holder: e.target.value })} />
                </>
              ) : (
                <Input placeholder="Binance ID" value={newMethod.binance_id} onChange={(e) => setNewMethod({ ...newMethod, binance_id: e.target.value })} />
              )}
              <Textarea placeholder="Instrucciones adicionales" value={newMethod.instructions} onChange={(e) => setNewMethod({ ...newMethod, instructions: e.target.value })} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addMethod.mutate(newMethod)}>Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {methods.map((m) => (
          <Card key={m.id} className="bg-secondary/50">
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                {m.type === "bank_transfer" ? <Banknote className="h-6 w-6 text-green-400" /> : <Bitcoin className="h-6 w-6 text-yellow-400" />}
                <div>
                  <p className="font-medium">{m.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.type === "bank_transfer" ? `${m.bank_name} · ${m.account_number}` : `ID: ${m.binance_id}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMethod.mutate(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {methods.length === 0 && !showAdd && (
          <p className="text-center text-muted-foreground py-8">No hay métodos de pago configurados</p>
        )}
      </CardContent>
    </Card>
  );
}

export default SuperAdminDashboard;

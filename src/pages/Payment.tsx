import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  Building2,
} from "lucide-react";

const Payment = () => {
  const { workshop, signOut, user } = useAuth();
  const { toast } = useToast();
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment_methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch plan details
  const { data: plan } = useQuery({
    queryKey: ["workshop_plan", workshop?.plan_id],
    queryFn: async () => {
      if (!workshop?.plan_id) return null;
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("id", workshop.plan_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workshop?.plan_id,
  });

  // Fetch existing payment requests
  const { data: existingRequests, refetch: refetchRequests } = useQuery({
    queryKey: ["my_payment_requests", workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*, plans(name)")
        .eq("workshop_id", workshop.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!workshop?.id,
  });

  const selectedMethod = paymentMethods?.find((m) => m.id === selectedMethodId);
  const amount = plan
    ? billingPeriod === "monthly"
      ? plan.monthly_price
      : plan.annual_price
    : 0;
  const currency = plan?.currency || "NIO";
  const symbol = currency === "USD" ? "$" : "C$";

  const hasPendingRequest = existingRequests?.some((r) => r.status === "pending");

  const handleSubmit = async () => {
    if (!workshop?.id || !workshop?.plan_id || !selectedMethodId) {
      toast({ title: "Error", description: "Selecciona un método de pago", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${workshop.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-receipts")
          .upload(fileName, receiptFile);
        if (uploadError) throw uploadError;

        // Store the storage path, not a public URL (bucket is private)
        receiptUrl = fileName;
      }

      const { error } = await supabase.from("payment_requests").insert({
        workshop_id: workshop.id,
        plan_id: workshop.plan_id,
        amount,
        currency,
        billing_period: billingPeriod,
        payment_method_id: selectedMethodId,
        receipt_url: receiptUrl,
        notes,
      });

      if (error) throw error;

      // Send Telegram notification to super admin
      try {
        await supabase.functions.invoke("telegram-notify", {
          body: {
            event: "payment_received",
            data: {
              workshop_name: workshop.name,
              currency: currency,
              amount: amount,
              plan_name: plan?.name || "N/A",
              has_receipt: !!receiptFile,
              billing_period: billingPeriod === "monthly" ? "Mensual" : "Anual",
              workshop_email: workshop.email || "N/A",
              workshop_whatsapp: workshop.whatsapp || "N/A",
            },
          },
        });
      } catch (telegramError) {
        console.error("Telegram notification error:", telegramError);
      }

      toast({
        title: "¡Solicitud enviada!",
        description: "Tu comprobante está siendo revisado. Recibirás una notificación pronto.",
      });

      refetchRequests();
      setReceiptFile(null);
      setNotes("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Building2 className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">{workshop?.name || "Tu Taller"}</h1>
          <p className="text-muted-foreground">
            Activa tu suscripción para comenzar a usar el sistema
          </p>
        </div>

        {/* Pending request banner */}
        {hasPendingRequest && (
          <Card className="border-yellow-500/30 bg-yellow-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
              <div>
                <p className="font-medium text-yellow-300">Pago en revisión</p>
                <p className="text-sm text-yellow-400/80">
                  Tu comprobante está siendo verificado. Esto puede tomar unos minutos.
                  Serás notificado cuando tu cuenta sea activada.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan info */}
        {plan && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Plan: {plan.name}
              </CardTitle>
              {plan.description && (
                <CardDescription>{plan.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    billingPeriod === "monthly"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <p className="font-bold text-lg">{symbol}{plan.monthly_price}</p>
                  <p className="text-xs">Mensual</p>
                </button>
                <button
                  onClick={() => setBillingPeriod("annual")}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    billingPeriod === "annual"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <p className="font-bold text-lg">{symbol}{plan.annual_price}</p>
                  <p className="text-xs">Anual</p>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment form */}
        {!hasPendingRequest && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Realizar pago</CardTitle>
              <CardDescription>
                Selecciona tu método de pago, transfiere y sube el comprobante
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMethod && (
                <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
                  {selectedMethod.bank_name && (
                    <p><span className="text-muted-foreground">Banco:</span> {selectedMethod.bank_name}</p>
                  )}
                  {selectedMethod.account_number && (
                    <p><span className="text-muted-foreground">Cuenta:</span> {selectedMethod.account_number}</p>
                  )}
                  {selectedMethod.account_holder && (
                    <p><span className="text-muted-foreground">Titular:</span> {selectedMethod.account_holder}</p>
                  )}
                  {selectedMethod.binance_id && (
                    <p><span className="text-muted-foreground">Binance ID:</span> {selectedMethod.binance_id}</p>
                  )}
                  {selectedMethod.instructions && (
                    <p className="text-muted-foreground mt-2">{selectedMethod.instructions}</p>
                  )}
                  <p className="font-bold text-primary mt-2">
                    Monto a transferir: {symbol}{amount}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Comprobante de pago</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {receiptFile ? receiptFile.name : "Subir comprobante"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referencia de transferencia, notas adicionales..."
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedMethodId || !receiptFile}
              >
                {isSubmitting ? "Enviando..." : "Enviar comprobante de pago"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Previous requests */}
        {existingRequests && existingRequests.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {existingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div className="flex items-center gap-2">
                    {req.status === "pending" && <Clock className="h-4 w-4 text-yellow-400" />}
                    {req.status === "approved" && <CheckCircle className="h-4 w-4 text-green-400" />}
                    {req.status === "rejected" && <AlertCircle className="h-4 w-4 text-red-400" />}
                    <span>{(req as any).plans?.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{req.currency === "USD" ? "$" : "C$"}{req.amount}</p>
                    <p className="text-xs text-muted-foreground capitalize">{req.status}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
};

export default Payment;

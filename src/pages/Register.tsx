import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, ArrowLeft, Building2, Phone, Mail, MapPin, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const { data: plans } = useQuery({
    queryKey: ["public_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    const workshopName = formData.get("workshop_name") as string;
    const phone = formData.get("phone") as string;
    const whatsapp = formData.get("whatsapp") as string;
    const address = formData.get("address") as string;

    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      const userId = authData.user.id;

      // 2. Create workshop
      const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
      const hasTrial = selectedPlan?.has_free_trial;

      const { error: wsError } = await supabase.from("workshops").insert({
        owner_id: userId,
        name: workshopName,
        phone,
        whatsapp,
        email,
        address,
        plan_id: selectedPlanId || null,
        subscription_status: hasTrial ? "trial" : "pending",
        trial_ends_at: hasTrial ? new Date(Date.now() + (selectedPlan?.trial_days || 7) * 86400000).toISOString() : null,
        is_active: hasTrial ? true : false,
      });

      if (wsError) throw wsError;

      // 3. Give them technician role (workshop admin)
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: "admin",
      });

      toast({
        title: "¡Registro exitoso!",
        description: hasTrial
          ? "Tu prueba gratis ha comenzado. Revisa tu email para confirmar tu cuenta."
          : "Tu cuenta ha sido creada. Revisa tu email y realiza el pago para activar tu taller.",
      });

      navigate("/login");
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
    <div className="min-h-screen bg-[hsl(222,47%,7%)] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Smartphone className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-bold">RepairControl</span>
        </div>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl">Registra tu taller</CardTitle>
            <CardDescription className="text-gray-400">
              Crea tu cuenta y comienza a gestionar tus reparaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Tu nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="full_name" name="full_name" placeholder="Tu nombre" className="pl-10 bg-white/5 border-white/10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workshop_name">Nombre del taller</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="workshop_name" name="workshop_name" placeholder="Mi Taller" className="pl-10 bg-white/5 border-white/10" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="email" name="email" type="email" placeholder="tu@email.com" className="pl-10 bg-white/5 border-white/10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10 bg-white/5 border-white/10" required minLength={6} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="phone" name="phone" placeholder="+505 1234 5678" className="pl-10 bg-white/5 border-white/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <MessageSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="whatsapp" name="whatsapp" placeholder="+505 1234 5678" className="pl-10 bg-white/5 border-white/10" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección (opcional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="address" name="address" placeholder="Dirección del taller" className="pl-10 bg-white/5 border-white/10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecciona un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - C${plan.monthly_price}/mes
                        {plan.has_free_trial && ` (${plan.trial_days} días gratis)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full">
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>

              <p className="text-center text-sm text-gray-400">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="text-cyan-400 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import { MessageSquare as MessageSquareIcon } from "lucide-react";

export default Register;

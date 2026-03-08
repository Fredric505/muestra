import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, ArrowLeft, Building2, Phone, Mail, MapPin, User, Lock, MessageSquare as MessageSquareIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";

const currencies = ["USD", "NIO", "HNL", "GTQ", "CRC", "PAB", "MXN", "COP", "PEN", "ARS", "CLP", "BRL", "EUR"];

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");

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
      try {
        const { data: ipCheck } = await supabase.functions.invoke("check-ip", {
          body: { action: "register_ip" },
        });
        if (ipCheck && !ipCheck.allowed) {
          toast({ title: t("auth.registrationBlocked"), description: ipCheck.reason, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      } catch (ipErr) {
        console.error("IP check error:", ipErr);
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      const userId = authData.user.id;

      const selectedPlan = plans?.find((p) => p.id === selectedPlanId);
      const hasTrial = selectedPlan?.has_free_trial;

      const workshopCurrency = selectedCurrency || "USD";
      
      const { error: wsError } = await supabase.from("workshops").insert({
        owner_id: userId,
        name: workshopName,
        phone,
        whatsapp,
        email,
        address,
        currency: workshopCurrency,
        plan_id: selectedPlanId || null,
        subscription_status: hasTrial ? "trial" : "pending",
        trial_ends_at: hasTrial ? new Date(Date.now() + (selectedPlan?.trial_days || 7) * 86400000).toISOString() : null,
        is_active: hasTrial ? true : false,
      } as any);

      if (wsError) throw wsError;

      try {
        await supabase.functions.invoke("telegram-notify", {
          body: {
            event: "workshop_registered",
            data: {
              name: workshopName,
              email,
              whatsapp,
              plan_name: selectedPlan?.name || "Sin plan",
            },
          },
        });
      } catch (e) {
        console.error("Telegram notify error:", e);
      }

      toast({
        title: t("auth.registrationSuccess"),
        description: hasTrial ? t("auth.trialStarted") : t("auth.accountCreated"),
      });

      await supabase.auth.signInWithPassword({ email, password });
      navigate(hasTrial ? "/panel/dashboard" : "/payment");
    } catch (error: any) {
      toast({
        title: t("common.error"),
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Smartphone className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-bold">RepairControl</span>
          </div>
          <LanguageSelector variant="ghost" />
        </div>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl">{t("auth.registerTitle")}</CardTitle>
            <CardDescription className="text-gray-400">
              {t("auth.registerSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="full_name" name="full_name" placeholder={t("auth.fullName")} className="pl-10 bg-white/5 border-white/10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workshop_name">{t("auth.workshopName")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="workshop_name" name="workshop_name" placeholder={t("auth.workshopName")} className="pl-10 bg-white/5 border-white/10" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="email" name="email" type="email" placeholder="tu@email.com" className="pl-10 bg-white/5 border-white/10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="password" name="password" type="password" placeholder={t("auth.minPasswordChars")} className="pl-10 bg-white/5 border-white/10" required minLength={6} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("common.phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="phone" name="phone" placeholder="+505 1234 5678" className="pl-10 bg-white/5 border-white/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">{t("auth.whatsapp")}</Label>
                  <div className="relative">
                    <MessageSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input id="whatsapp" name="whatsapp" placeholder="+505 1234 5678" className="pl-10 bg-white/5 border-white/10" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("auth.addressOptional")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="address" name="address" placeholder={t("auth.address")} className="pl-10 bg-white/5 border-white/10" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("auth.workshopCurrency")}</Label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency} required>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder={t("auth.selectCurrency")} />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((code) => (
                        <SelectItem key={code} value={code}>{t(`currencies.${code}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("auth.plan")}</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder={t("auth.selectPlan")} />
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {(plan as any).currency === "USD" ? "$" : "C$"}{plan.monthly_price}/{t("common.month")}
                          {plan.has_free_trial && ` (${plan.trial_days} ${t("common.days")} ${t("landing.freeTrial").toLowerCase()})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full">
                {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
              </Button>

              <p className="text-center text-sm text-gray-400">
                {t("auth.hasAccount")}{" "}
                <Link to="/login" className="text-cyan-400 hover:underline">
                  {t("auth.signIn")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;

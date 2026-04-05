import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Users,
  BarChart3,
  Printer,
  MessageSquare,
  Shield,
  Check,
  ArrowRight,
  Smartphone,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const features = [
    { icon: Wrench, title: t("landing.featureRepairs"), description: t("landing.featureRepairsDesc") },
    { icon: Users, title: t("landing.featureEmployees"), description: t("landing.featureEmployeesDesc") },
    { icon: BarChart3, title: t("landing.featureReports"), description: t("landing.featureReportsDesc") },
    { icon: Printer, title: t("landing.featureLabels"), description: t("landing.featureLabelsDesc") },
    { icon: MessageSquare, title: t("landing.featureWhatsApp"), description: t("landing.featureWhatsAppDesc") },
    { icon: Shield, title: t("landing.featureWarranty"), description: t("landing.featureWarrantyDesc") },
  ];

  return (
    <div className="min-h-screen bg-[hsl(222,47%,7%)] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[hsl(222,47%,7%)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Smartphone className="h-7 w-7 text-cyan-400" />
              <span className="text-xl font-bold">RepairControl</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">{t("landing.features")}</a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">{t("landing.pricing")}</a>
              <LanguageSelector variant="ghost" />
              <Link to="/login" className="text-sm font-semibold hover:text-cyan-400 transition-colors">{t("landing.login")}</Link>
              <Link to="/register">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full px-6">
                  {t("landing.freeTrial")}
                </Button>
              </Link>
            </div>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[hsl(222,47%,7%)] p-4 space-y-3">
            <a href="#features" className="block text-gray-400 hover:text-white">{t("landing.features")}</a>
            <a href="#pricing" className="block text-gray-400 hover:text-white">{t("landing.pricing")}</a>
            <LanguageSelector variant="outline" />
            <Link to="/login" className="block font-semibold">{t("landing.login")}</Link>
            <Link to="/register">
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full">{t("landing.freeTrial")}</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-cyan-500/30 text-cyan-400 px-4 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {t("landing.heroSubtitle")}
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            {t("landing.heroTitle1")}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {t("landing.heroTitleHighlight")}
            </span>{" "}
            {t("landing.heroTitle2")}
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            {t("landing.heroDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full px-8 text-base">
                {t("landing.freeTrialDays")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 rounded-full px-8 text-base">
                {t("landing.viewPricing")}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("landing.allYouNeed")}</h2>
            <p className="text-gray-400 text-lg">{t("landing.allYouNeedDesc")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <f.icon className="h-10 w-10 text-cyan-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 border-t border-white/5">
        <PricingSection />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-cyan-400" />
            <span className="font-bold">RepairControl</span>
          </div>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} RepairControl. {t("landing.allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  );
};

// Pricing section as separate component to be reusable
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const { t, i18n } = useTranslation();

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("landing.plansAndPricing")}</h2>
        <p className="text-gray-400 text-lg mb-8">{t("landing.plansDesc")}</p>
        <div className="inline-flex bg-white/5 rounded-full p-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === "monthly" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            {t("landing.monthly")}
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === "annual" ? "bg-cyan-500 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            {t("landing.annual")} <span className="text-xs opacity-80">(-17%)</span>
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.map((plan, i) => {
          const price = billingPeriod === "monthly" ? plan.monthly_price : plan.annual_price;
          const perMonth = billingPeriod === "annual" ? Math.round(plan.annual_price / 12) : plan.monthly_price;
          const lang = i18n.language?.substring(0, 2);
          const planName = (lang !== "es" && (plan as any)[`name_${lang}`]) || plan.name;
          const planDesc = (lang !== "es" && (plan as any)[`description_${lang}`]) || plan.description;
          const features = ((lang !== "es" && (plan as any)[`features_${lang}`]) || plan.features as string[]) || [];
          const isPopular = i === 1;
          return (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl border transition-all ${
                isPopular
                  ? "border-cyan-500/50 bg-cyan-500/5 scale-105"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black font-semibold">
                  {t("landing.mostPopular")}
                </Badge>
              )}
              <h3 className="text-xl font-bold mb-1">{planName}</h3>
              <p className="text-gray-400 text-sm mb-4">{planDesc}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{getCurrencySymbol(plan.currency)}{perMonth}</span>
                <span className="text-gray-400 text-sm">{t("landing.perMonth")}</span>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-gray-500 mt-1">{getCurrencySymbol(plan.currency)}{price} {t("landing.billedAnnually")}</p>
                )}
              </div>
              <Link to="/register">
                <Button
                  className={`w-full rounded-full font-semibold mb-6 ${
                    isPopular ? "bg-cyan-500 hover:bg-cyan-600 text-black" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {plan.has_free_trial ? t("landing.freeTrialPlanDays", { days: plan.trial_days }) : t("landing.startNow")}
                </Button>
              </Link>
              <ul className="space-y-3">
                {(Array.isArray(features) ? features : []).map((feature: string, fi: number) => (
                  <li key={fi} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Landing;

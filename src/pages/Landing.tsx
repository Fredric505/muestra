import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  Users,
  BarChart3,
  Printer,
  MessageSquare,
  Shield,
  Check,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Star,
  Zap,
  Smartphone,
} from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getCurrencySymbol } from "@/lib/currency";
import { PhoneTeardown } from "@/components/PhoneTeardown";

const fontDisplay = { fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif" };
const fontBody = { fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif" };

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

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
    <div className="min-h-screen bg-[#0c0816] text-indigo-50 overflow-x-hidden" style={fontBody}>
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 h-[34rem] w-[34rem] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-1/4 -right-40 h-[32rem] w-[32rem] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0c0816]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight" style={fontDisplay}>RepairControl</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-indigo-100/60 hover:text-white transition-colors">{t("landing.features")}</a>
              <a href="#pricing" className="text-sm text-indigo-100/60 hover:text-white transition-colors">{t("landing.pricing")}</a>
              <LanguageSelector variant="ghost" />
              <Link to="/login" className="text-sm font-semibold hover:text-orange-300 transition-colors">{t("landing.login")}</Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 hover:opacity-90 text-white font-bold rounded-full px-6 shadow-lg shadow-fuchsia-500/25 transition-all">
                  {t("landing.freeTrial")}
                </Button>
              </Link>
            </div>
            <button className="md:hidden p-1" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-white/5 bg-[#0c0816] px-5 py-6 flex flex-col gap-5"
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base text-indigo-100/80 hover:text-white transition-colors">{t("landing.features")}</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base text-indigo-100/80 hover:text-white transition-colors">{t("landing.pricing")}</a>
            <div><LanguageSelector variant="outline" /></div>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-white hover:text-orange-300 transition-colors">{t("landing.login")}</Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 text-white font-bold rounded-full">{t("landing.freeTrial")}</Button>
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero - split layout */}
      <section className="relative z-10 pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              {t("landing.heroSubtitle")}
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="show" className="text-4xl sm:text-6xl font-extrabold leading-[1.05] mb-6 tracking-tight" style={fontDisplay}>
              {t("landing.heroTitle1")}{" "}
              <span className="bg-gradient-to-r from-orange-300 via-rose-400 to-fuchsia-400 bg-clip-text text-transparent">
                {t("landing.heroTitleHighlight")}
              </span>{" "}
              {t("landing.heroTitle2")}
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="show" className="text-lg sm:text-xl text-indigo-100/60 max-w-xl mx-auto lg:mx-0 mb-10">
              {t("landing.heroDescription")}
            </motion.p>
            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="show" className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/register">
                <Button size="lg" className="group bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 hover:opacity-90 text-white font-bold rounded-full px-8 text-base shadow-xl shadow-fuchsia-500/30 transition-all">
                  {t("landing.freeTrialDays")}
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white rounded-full px-8 text-base">
                  {t("landing.viewPricing")}
                </Button>
              </a>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} initial="hidden" animate="show" className="mt-10 flex items-center justify-center lg:justify-start gap-2 text-sm text-indigo-100/50">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-orange-300 text-orange-300" />
                ))}
              </div>
              <span>4.9/5 · {new Date().getFullYear()}</span>
            </motion.div>
          </div>

          {/* Animated phone teardown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="order-first lg:order-last"
          >
            <PhoneTeardown />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-300 mb-3">
              <Zap className="h-4 w-4" /> {t("landing.features")}
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight" style={fontDisplay}>{t("landing.allYouNeed")}</h2>
            <p className="text-indigo-100/60 text-lg">{t("landing.allYouNeedDesc")}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="group relative p-7 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-fuchsia-400/30 hover:shadow-2xl hover:shadow-fuchsia-500/10"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400/20 to-fuchsia-500/15 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-7 w-7 text-orange-300" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={fontDisplay}>{f.title}</h3>
                <p className="text-indigo-100/55 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-24 px-4 border-t border-white/5">
        <PricingSection />
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-500">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold" style={fontDisplay}>RepairControl</span>
          </div>
          <p className="text-sm text-indigo-100/40">© {new Date().getFullYear()} RepairControl. {t("landing.allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  );
};

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
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center mb-12">
        <h2 className="text-3xl sm:text-5xl font-bold mb-4 tracking-tight" style={fontDisplay}>{t("landing.plansAndPricing")}</h2>
        <p className="text-indigo-100/60 text-lg mb-8">{t("landing.plansDesc")}</p>
        <div className="inline-flex bg-white/5 ring-1 ring-white/10 rounded-full p-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              billingPeriod === "monthly" ? "bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 text-white" : "text-indigo-100/60 hover:text-white"
            }`}
          >
            {t("landing.monthly")}
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              billingPeriod === "annual" ? "bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 text-white" : "text-indigo-100/60 hover:text-white"
            }`}
          >
            {t("landing.annual")} <span className="text-xs opacity-80">(-17%)</span>
          </button>
        </div>
      </motion.div>
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
            <motion.div
              key={plan.id}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className={`relative p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 ${
                isPopular
                  ? "border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-500/10 to-orange-500/[0.03] shadow-2xl shadow-fuchsia-500/15 lg:scale-105"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-400 to-fuchsia-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                  {t("landing.mostPopular")}
                </span>
              )}
              <h3 className="text-xl font-bold mb-1" style={fontDisplay}>{planName}</h3>
              <p className="text-indigo-100/55 text-sm mb-4">{planDesc}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold" style={fontDisplay}>{getCurrencySymbol(plan.currency)}{perMonth}</span>
                <span className="text-indigo-100/50 text-sm">{t("landing.perMonth")}</span>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-indigo-100/40 mt-1">{getCurrencySymbol(plan.currency)}{price} {t("landing.billedAnnually")}</p>
                )}
              </div>
              <Link to="/register">
                <Button
                  className={`w-full rounded-full font-bold mb-6 ${
                    isPopular
                      ? "bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-500 hover:opacity-90 text-white shadow-lg shadow-fuchsia-500/25"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {plan.has_free_trial ? t("landing.freeTrialPlanDays", { days: plan.trial_days }) : t("landing.startNow")}
                </Button>
              </Link>
              <ul className="space-y-3">
                {(Array.isArray(features) ? features : []).map((feature: string, fi: number) => (
                  <li key={fi} className="flex items-start gap-2.5 text-sm text-indigo-100/75">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-fuchsia-400/20">
                      <Check className="h-3 w-3 text-orange-300" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default Landing;

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Smartphone, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";

const Login = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { signIn, user, isSuperAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
  if (!user) return;
  if (authLoading) return;

  if (isSuperAdmin === true) {
    navigate("/super-admin", { replace: true });
  }

  if (isSuperAdmin === false) {
    navigate("/panel/dashboard", { replace: true });
  }

}, [user, isSuperAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: t("auth.loginError"),
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: t("auth.welcome"),
        description: t("auth.loginSuccess"),
      });
      setLoginSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,7%)] p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Smartphone className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-bold text-white">RepairControl</span>
          </div>
          <LanguageSelector variant="ghost" />
        </div>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">{t("auth.loginTitle")}</CardTitle>
            <CardDescription className="text-gray-400">
              {t("auth.loginSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-300">{t("auth.emailLabel")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-300">{t("auth.passwordLabel")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-full" disabled={isLoading}>
                {isLoading ? t("auth.loggingIn") : t("auth.loginButton")}
              </Button>
              <p className="text-center text-sm text-gray-400">
                {t("auth.noAccount")}{" "}
                <Link to="/register" className="text-cyan-400 hover:underline">
                  {t("auth.registerWorkshop")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

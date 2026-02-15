import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Smartphone, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente",
      });
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);
        
        const userRoles = roles?.map(r => r.role) || [];
        if (userRoles.includes("super_admin")) {
          navigate("/super-admin");
        } else {
          navigate("/panel/dashboard");
        }
      } else {
        navigate("/panel/dashboard");
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,7%)] p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Smartphone className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-bold text-white">RepairControl</span>
        </div>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Iniciar Sesión</CardTitle>
            <CardDescription className="text-gray-400">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-300">Correo electrónico</Label>
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
                <Label htmlFor="login-password" className="text-gray-300">Contraseña</Label>
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
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
              <p className="text-center text-sm text-gray-400">
                ¿No tienes cuenta?{" "}
                <Link to="/register" className="text-cyan-400 hover:underline">
                  Registra tu taller
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

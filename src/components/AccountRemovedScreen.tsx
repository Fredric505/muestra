import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserX, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const AccountRemovedScreen = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,7%)] p-4">
      <Card className="max-w-md w-full bg-white/[0.03] border-yellow-500/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
            <UserX className="h-8 w-8 text-yellow-400" />
          </div>
          <CardTitle className="text-xl text-white">Sin Taller Asignado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-400 text-sm leading-relaxed">
            Tu cuenta ya no está vinculada a ningún taller. Es posible que el administrador te haya dado de baja.
          </p>
          <p className="text-gray-500 text-xs">
            Si crees que es un error, contacta al administrador de tu taller. También puedes registrar tu propio taller.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link to="/register">
              <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold gap-2">
                <UserPlus className="h-4 w-4" />
                Registrar mi propio taller
              </Button>
            </Link>
            <Button variant="outline" className="w-full gap-2 text-gray-400 border-white/10 hover:bg-white/5" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MessageCircle, LogOut, Clock, Wrench, ShieldAlert, Ban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const SUPPORT_WHATSAPP = "+50588897925";

interface AccountBlockedScreenProps {
  type: "deleted" | "paused";
  pauseType?: string | null;
  pauseReason?: string | null;
  pauseEstimatedResume?: string | null;
}

export const AccountBlockedScreen = ({ type, pauseType, pauseReason, pauseEstimatedResume }: AccountBlockedScreenProps) => {
  const { signOut } = useAuth();

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
    type === "deleted"
      ? "Hola, mi taller fue eliminado de la plataforma y me gustaría más información al respecto."
      : "Hola, mi taller está pausado y me gustaría más información."
  )}`;

  if (type === "deleted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,7%)] p-4">
        <Card className="max-w-md w-full bg-white/[0.03] border-red-500/30">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Ban className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-xl text-white">Cuenta Eliminada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-400 text-sm leading-relaxed">
              Tu taller ha sido eliminado de la plataforma. Esto puede deberse a:
            </p>
            <ul className="text-left space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                Vencimiento prolongado de la suscripción
              </li>
              <li className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                Violación de las políticas de uso
              </li>
              <li className="flex items-start gap-2">
                <Ban className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                Anomalías detectadas en la cuenta
              </li>
            </ul>
            <p className="text-gray-500 text-xs">
              Si crees que esto es un error o deseas apelar esta decisión, contacta a soporte.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contactar Soporte por WhatsApp
                </Button>
              </a>
              <Button variant="outline" className="w-full gap-2 text-gray-400 border-white/10 hover:bg-white/5" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Paused
  const isPauseMaintenance = pauseType === "maintenance";
  const resumeDate = pauseEstimatedResume ? new Date(pauseEstimatedResume) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,7%)] p-4">
      <Card className="max-w-md w-full bg-white/[0.03] border-orange-500/30">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
            {isPauseMaintenance ? (
              <Wrench className="h-8 w-8 text-orange-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            )}
          </div>
          <CardTitle className="text-xl text-white">
            {isPauseMaintenance ? "En Mantenimiento" : "Cuenta Suspendida"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-400 text-sm leading-relaxed">
            {isPauseMaintenance
              ? "Tu taller se encuentra temporalmente en mantenimiento. Estamos trabajando para mejorar tu experiencia."
              : "Tu taller ha sido suspendido temporalmente."}
          </p>
          {pauseReason && (
            <div className="bg-white/5 rounded-lg p-3 text-left">
              <p className="text-xs text-gray-500 mb-1">Motivo:</p>
              <p className="text-sm text-gray-300">{pauseReason}</p>
            </div>
          )}
          {resumeDate && (
            <div className="flex items-center justify-center gap-2 text-sm text-cyan-400">
              <Clock className="h-4 w-4" />
              <span>
                Estimado de vuelta: {resumeDate.toLocaleDateString("es-NI", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          <p className="text-gray-500 text-xs">
            Si necesitas más información, contacta a soporte.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                <MessageCircle className="h-4 w-4" />
                Contactar Soporte por WhatsApp
              </Button>
            </a>
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

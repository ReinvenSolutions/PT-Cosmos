import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, Mail, ArrowLeft } from "lucide-react";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSent(false);

    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setSent(true);
      toast({
        title: "Correo enviado",
        description: "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden relative">
      <ThemeToggleCompact />
      <div className="hidden lg:flex relative h-full flex-col bg-muted text-white dark:border-r">
        <div className="absolute inset-0 bg-zinc-900">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
            alt="Travel Background"
            className="h-full w-full object-cover opacity-50"
          />
        </div>
        <div className="relative z-20 flex items-center text-lg font-medium p-10">
          <div className="rounded-full bg-white/10 p-2 mr-2 backdrop-blur-sm">
            <Plane className="h-6 w-6" />
          </div>
          Cotizador Cosmos
        </div>
        <div className="relative z-20 mt-auto p-10">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "El mundo es un libro y aquellos que no viajan solo leen una página."
            </p>
            <footer className="text-sm text-zinc-300">Agustín de Hipona</footer>
          </blockquote>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 min-h-screen bg-background/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[400px] space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Plane className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Recuperar contraseña</h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          {sent ? (
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm text-center text-muted-foreground">
                Revisa tu bandeja de entrada. Si no ves el correo, revisa la carpeta de spam.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="nombre@ejemplo.com"
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11"
                    required
                  />
                </div>
              </div>

              <Button className="w-full h-11" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </div>
                ) : (
                  "Enviar enlace de recuperación"
                )}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground" type="button">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

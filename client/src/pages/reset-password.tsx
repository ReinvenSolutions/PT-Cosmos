import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, Lock, Eye, EyeOff, Check, X, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPassword() {
  const urlToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
  const [token, setToken] = useState(urlToken || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t);
  }, []);

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^a-zA-Z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthLabel = (strength: number) => {
    if (strength === 0) return { text: "", color: "" };
    if (strength <= 25) return { text: "Débil", color: "text-red-500" };
    if (strength <= 50) return { text: "Media", color: "text-yellow-500" };
    if (strength <= 75) return { text: "Buena", color: "text-blue-500" };
    return { text: "Fuerte", color: "text-green-500" };
  };

  const strengthLabel = getStrengthLabel(passwordStrength);
  const requirements = [
    { text: "Al menos 8 caracteres", met: password.length >= 8 },
    { text: "Mayúsculas y minúsculas", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { text: "Al menos un número", met: /[0-9]/.test(password) },
  ];

  const isValid = password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: "Enlace inválido", description: "Falta el token. Solicita un nuevo enlace.", variant: "destructive" });
      return;
    }
    if (!isValid) return;

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password,
        confirmPassword,
      });
      setSuccess(true);
      toast({ title: "Contraseña actualizada", description: "Ya puedes iniciar sesión con tu nueva contraseña." });
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <ThemeToggleCompact />
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Enlace inválido</h1>
          <p className="text-muted-foreground">Este enlace ha expirado o no es válido. Solicita uno nuevo.</p>
          <Button asChild>
            <Link href="/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <ThemeToggleCompact />
        <div className="text-center space-y-4 max-w-md">
          <div className="rounded-full bg-green-500/20 p-4 w-fit mx-auto">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Contraseña actualizada</h1>
          <p className="text-muted-foreground">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    );
  }

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
      </div>

      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 min-h-screen bg-background/95 backdrop-blur-sm overflow-y-auto">
        <div className="mx-auto w-full max-w-[420px] space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Nueva contraseña</h1>
            <p className="text-sm text-muted-foreground">
              Crea una contraseña segura para tu cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2 mt-2 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fuerza:</span>
                    <span className={`font-medium ${strengthLabel.color}`}>{strengthLabel.text}</span>
                  </div>
                  <Progress value={passwordStrength} className="h-1.5" />
                  <div className="grid grid-cols-1 gap-1 mt-2">
                    {requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {req.met ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-muted-foreground" />}
                        <span className={req.met ? "text-green-600" : "text-muted-foreground"}>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  placeholder="••••••••"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isLoading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9 pr-10 h-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <div className="mt-1">
                  {password !== confirmPassword ? (
                    <p className="text-xs text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Las contraseñas no coinciden</p>
                  ) : (
                    <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Las contraseñas coinciden</p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full h-11" type="submit" disabled={isLoading || !isValid}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Actualizando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Actualizar contraseña <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground">Volver al inicio de sesión</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

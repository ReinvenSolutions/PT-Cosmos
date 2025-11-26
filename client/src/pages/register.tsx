import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, Eye, EyeOff, Check, X, User, Mail, Lock, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength += 20;
    if (pass.length >= 8) strength += 20;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength += 20;
    if (/[0-9]/.test(pass)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(pass)) strength += 20;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthLabel = (strength: number) => {
    if (strength === 0) return { text: "", color: "" };
    if (strength <= 40) return { text: "Débil", color: "text-red-500" };
    if (strength <= 60) return { text: "Media", color: "text-yellow-500" };
    if (strength <= 80) return { text: "Buena", color: "text-blue-500" };
    return { text: "Fuerte", color: "text-green-500" };
  };

  const strengthLabel = getStrengthLabel(passwordStrength);

  // Password requirements
  const requirements = [
    { text: "Al menos 6 caracteres", met: password.length >= 6 },
    { text: "Contiene mayúsculas y minúsculas", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { text: "Contiene números", met: /[0-9]/.test(password) },
    { text: "Contiene caracteres especiales", met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrarse");
      }

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada. Por favor inicia sesión.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error al registrarse",
        description: error.message || "Ocurrió un error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left Side - Image & Branding */}
      <div className="hidden lg:flex relative h-full flex-col bg-muted text-white dark:border-r">
        <div className="absolute inset-0 bg-zinc-900">
          <img
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
            alt="Travel Background"
            className="h-full w-full object-cover opacity-50"
          />
        </div>
        <div className="relative z-20 flex items-center text-lg font-medium p-10">
          <div className="rounded-full bg-white/10 p-2 mr-2 backdrop-blur-sm">
            <Plane className="h-6 w-6" />
          </div>
          ViajeRápido
        </div>
        <div className="relative z-20 mt-auto p-10">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Un viaje de mil millas comienza con un solo paso."
            </p>
            <footer className="text-sm text-zinc-300">Lao Tse</footer>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background overflow-y-auto h-full">
        <div className="mx-auto w-full max-w-[450px] space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Plane className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Crear una cuenta</h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tus datos para registrarte en la plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  type="text"
                  autoComplete="name"
                  disabled={isLoading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
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
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                        {req.met ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
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
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword && (
                <div className="mt-1">
                  {password !== confirmPassword ? (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Las contraseñas no coinciden
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Las contraseñas coinciden
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full h-11" type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creando cuenta...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Crear Cuenta <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ¿Ya tienes una cuenta?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link href="/login">
              <Button variant="outline" className="w-full h-11" type="button">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, UserPlus, Eye, EyeOff, Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);alse);
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Sistema de Cotizaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Paquetes Turísticos
          </p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <UserPlus className="w-6 h-6" />
              Crear Cuenta
            </CardTitle>
            <CardDescription className="text-center">
              Regístrate como asesor de viajes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fuerza de la contraseña:</span>
                      <span className={`font-medium ${strengthLabel.color}`}>{strengthLabel.text}</span>
                    </div>
                    <Progress value={passwordStrength} className="h-2" />
                    <div className="space-y-1 mt-2">
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
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Las contraseñas no coinciden
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Las contraseñas coinciden
                  </p>
                )}
              </div>
              <Button
                type="submit"
                data-testid="button-register"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                disabled={isLoading}
              >
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline" data-testid="link-login">
                Inicia sesión
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Al registrarte, podrás crear y gestionar cotizaciones para tus clientes
        </p>
      </div>
    </div>
  );
}

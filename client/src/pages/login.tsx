import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { ThemeToggleCompact } from "@/components/theme-toggle";
import { TwoFactorInput } from "@/components/two-factor-input";

const FlagIcon = ({ code, title }: { code: string, title: string }) => (
  <img 
    src={`https://flagsapi.com/${code.toUpperCase()}/shiny/64.png`}
    alt={title}
    title={title}
    className="h-12 w-auto object-contain drop-shadow-md hover:scale-125 hover:-rotate-6 transition-all duration-300 cursor-help filter hover:brightness-110"
  />
);

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [tempToken, setTempToken] = useState("");
  const [code2FA, setCode2FA] = useState("");
  const [codeError, setCodeError] = useState(false);
  const { user, login, verify2FA } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirigir cuando el usuario esté autenticado tras 2FA (evita race: sesión lista antes de navegar)
  useEffect(() => {
    if (user && step === "2fa") {
      toast({ title: "¡Bienvenido!", description: "Has iniciado sesión correctamente." });
      navigate("/");
    }
  }, [user, step, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCodeError(false);

    try {
      const result = await login(username, password);
      if ("needs2FA" in result && result.needs2FA) {
        setTempToken(result.tempToken);
        setStep("2fa");
        toast({
          title: "Código enviado",
          description: result.message || "Revisa tu correo para el código de verificación.",
        });
      } else if ("user" in result) {
        toast({ title: "¡Bienvenido de nuevo!", description: "Has iniciado sesión correctamente." });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Credenciales inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code2FA.length !== 6) return;
    setIsLoading(true);
    setCodeError(false);

    try {
      await verify2FA(tempToken, code2FA);
      // La redirección la hace el useEffect cuando user esté en el contexto
    } catch (error: any) {
      setCodeError(true);
      toast({
        title: "Código inválido",
        description: error.message || "El código es incorrecto o ha expirado. Intenta iniciar sesión de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setTempToken("");
    setCode2FA("");
    setCodeError(false);
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden relative">
      <ThemeToggleCompact />
      {/* Left Side - Image & Branding */}
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

      {/* Right Side - Login Form */}
      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 min-h-screen bg-background/95 backdrop-blur-sm">
        {/* Destinations Banner */}
        <div className="text-center space-y-6 mb-10 w-full max-w-[600px]">
          <h2 className="text-3xl font-bold text-foreground">
            Descubre el Mundo con Cosmos
          </h2>
          
          {/* Banderas estilo Shiny (3D/Brillantes) */}
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-4.5 p-3">
            <FlagIcon code="PE" title="Perú" />
            <FlagIcon code="TR" title="Turquía" />
            <FlagIcon code="AE" title="Emiratos Árabes" />
            <FlagIcon code="EG" title="Egipto" />
            <FlagIcon code="FI" title="Finlandia" />
            <FlagIcon code="ES" title="España" />
            <FlagIcon code="FR" title="Francia" />
            <FlagIcon code="CH" title="Suiza" />
            <FlagIcon code="IT" title="Italia" />
          </div>
          
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </div>

        <div className="mx-auto w-full max-w-[400px] space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Plane className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder a tu cuenta
            </p>
          </div>

          {step === "2fa" ? (
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">Verificación en dos pasos</h2>
                  <p className="text-sm text-muted-foreground">
                    Ingresa el código de 6 dígitos que enviamos a tu correo
                  </p>
                </div>
                <TwoFactorInput
                  value={code2FA}
                  onChange={(v) => { setCode2FA(v); setCodeError(false); }}
                  disabled={isLoading}
                  error={codeError}
                />
                <Button className="w-full h-11" type="submit" disabled={isLoading || code2FA.length !== 6}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Verificando...
                    </div>
                  ) : (
                    "Verificar"
                  )}
                </Button>
                <Button variant="ghost" type="button" onClick={handleBackToCredentials} className="text-muted-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario o Correo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="nombre@ejemplo.com"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect="off"
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="/forgot-password">
                  <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
            </div>

            <Button className="w-full h-11" type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Iniciando sesión...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Iniciar Sesión <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
          )}

          {step === "credentials" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    ¿No tienes una cuenta?
                  </span>
                </div>
              </div>
              <div className="text-center">
                <Link href="/register">
                  <Button variant="outline" className="w-full h-11" type="button">
                    Crear una cuenta
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
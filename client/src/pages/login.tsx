import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Has iniciado sesión correctamente.",
      });
      navigate("/");
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

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
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
      <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background min-h-screen">
        {/* Destinations Banner */}
        <div className="text-center space-y-6 mb-10 w-full max-w-[600px]">
          <h2 className="text-3xl font-bold text-gray-800">
            Descubre el Mundo con Cosmos
          </h2>
          
          <div className="flex flex-wrap justify-center items-center gap-8">
            <span className="text-4xl" title="Perú">🇵🇪</span>
            <span className="text-4xl" title="Turquía">🇹🇷</span>
            <span className="text-4xl" title="Emiratos Árabes">🇦🇪</span>
            <span className="text-4xl" title="Egipto">🇪🇬</span>
            <span className="text-4xl" title="Finlandia">🇫🇮</span>
            <span className="text-4xl" title="España">🇪🇸</span>
            <span className="text-4xl" title="Francia">🇫🇷</span>
            <span className="text-4xl" title="Suiza">🇨🇭</span>
            <span className="text-4xl" title="Italia">🇮🇹</span>
          </div>
          
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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
        </div>
      </div>
    </div>
  );
}

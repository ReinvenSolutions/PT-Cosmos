import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminTools() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const { toast } = useToast();

  const handleSeedDatabase = async () => {
    if (!confirm("¿Estás seguro de que quieres poblar la base de datos? Esta acción agregará todos los destinos y sus datos relacionados.")) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/admin/seed-database");
      const data = await response.json();

      setResult({
        success: true,
        message: data.message || "Base de datos poblada exitosamente",
        count: data.destinationsCreated,
      });

      toast({
        title: "Éxito",
        description: `Base de datos poblada con ${data.destinationsCreated} destinos`,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Error al poblar la base de datos";
      
      setResult({
        success: false,
        message: errorMessage,
      });

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Herramientas de Administración</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Poblar Base de Datos
            </CardTitle>
            <CardDescription>
              Ejecuta el script de seed para poblar la base de datos de producción con todos los destinos, itinerarios, hoteles, inclusiones y exclusiones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Solo ejecuta esta acción si la base de datos está vacía. 
                  Si ya contiene destinos, recibirás un error de protección.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSeedDatabase}
                  disabled={loading}
                  size="lg"
                  data-testid="button-seed-database"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Poblando base de datos...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Ejecutar Seed de Base de Datos
                    </>
                  )}
                </Button>
              </div>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>
                    <strong>{result.success ? "Éxito:" : "Error:"}</strong> {result.message}
                    {result.count && <> ({result.count} destinos creados)</>}
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-gray-600 mt-4">
                <p><strong>¿Qué hace este proceso?</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Crea 31 destinos (Turquía, Dubai, Egipto, Grecia, Tailandia, Vietnam, Perú)</li>
                  <li>Agrega itinerarios día por día para cada destino</li>
                  <li>Incluye información de hoteles</li>
                  <li>Lista inclusiones y exclusiones</li>
                  <li>Configura destinos de Turquía con restricción de martes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MonitoringErrorFallback() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 pb-20">
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-semibold text-primary mb-4">Algo deu errado</h1>
        <p className="text-muted-foreground mb-6">Não foi possível carregar o app. Tente recarregar a página.</p>
        <Button className="min-h-12" onClick={() => window.location.reload()}>
          <RotateCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Recarregar
        </Button>
      </div>
    </main>
  );
}
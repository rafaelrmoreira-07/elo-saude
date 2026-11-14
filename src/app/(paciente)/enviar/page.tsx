import { PageHeader } from "@/components/ui";
import { PausedGate } from "@/components/PausedGate";
import { Uploader } from "@/components/Uploader";

export default function EnviarPage() {
  return (
    <div>
      <PageHeader title="Enviar">Laudos em papel ou PDF. A leitura organiza tudo e você confere antes de salvar.</PageHeader>
      <PausedGate action="enviar laudos e importar dados">
        <Uploader />
      </PausedGate>
    </div>
  );
}

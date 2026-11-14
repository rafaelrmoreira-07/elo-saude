import { BackLink } from "@/components/BackLink";
import { ConnectCatalog } from "@/components/ConnectCatalog";
import { PausedGate } from "@/components/PausedGate";
import { PageHeader } from "@/components/ui";

export default function ConexoesPage() {
  return (
    <div>
      <BackLink fallback="/configuracoes/#conexoes" />
      <PageHeader title="Gerenciar outros apps">Conecte ou importe os dados dos seus apps e aparelhos. Os aparelhos chegam pelo app de cada um.</PageHeader>
      <PausedGate action="conectar ou importar dados de apps e aparelhos">
        <ConnectCatalog />
      </PausedGate>
    </div>
  );
}

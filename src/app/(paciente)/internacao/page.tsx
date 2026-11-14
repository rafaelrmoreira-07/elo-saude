import { PausedGate } from "@/components/PausedGate";
import { InternacaoView } from "@/components/views/InternacaoView";

export default function InternacaoPage() {
  return (
    <PausedGate action="montar ou enviar a pasta de internação">
      <InternacaoView />
    </PausedGate>
  );
}

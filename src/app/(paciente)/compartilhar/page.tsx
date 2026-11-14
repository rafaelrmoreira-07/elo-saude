import { CareHeader } from "@/components/CareHeader";
import { PausedGate } from "@/components/PausedGate";
import { ShareForm } from "@/components/ShareForm";

export default function CompartilharPage() {
  return (
    <div>
      <CareHeader active="consulta">Um link para o médico ver exames, remédios e medições numa tela só. Você escolhe o quê e por quanto tempo.</CareHeader>
      <PausedGate action="compartilhar com médico ou hospital">
        <ShareForm />
      </PausedGate>
    </div>
  );
}

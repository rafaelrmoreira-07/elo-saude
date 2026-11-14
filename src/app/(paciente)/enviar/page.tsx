import { PageHeader } from "@/components/ui";
import { Uploader } from "@/components/Uploader";

export default function EnviarPage() {
  return (
    <div>
      <PageHeader title="Enviar">Laudos em papel ou PDF. A leitura organiza tudo e você confere antes de salvar.</PageHeader>
      <Uploader />
    </div>
  );
}

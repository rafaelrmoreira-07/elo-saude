import Link from "next/link";
import { ConnectCatalog } from "@/components/ConnectCatalog";
import { BackIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";

export default function ConexoesPage() {
  return (
    <div>
      <Link href="/configuracoes/#conexoes" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-ink">
        <BackIcon width={20} /> Configurações
      </Link>
      <PageHeader title="Conectar app">Escolha de onde vêm os seus dados. Os aparelhos chegam pelo app de cada um.</PageHeader>
      <ConnectCatalog />
    </div>
  );
}

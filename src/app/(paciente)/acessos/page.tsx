import Link from "next/link";
import { Shares } from "@/components/care/Shares";
import { BackIcon } from "@/components/icons";
import { PageHeader } from "@/components/ui";

export default function AcessosPage() {
  return (
    <div>
      <Link href="/compartilhar" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-ink">
        <BackIcon width={20} /> Médico e hospital
      </Link>
      <PageHeader title="Quem tem acesso">Quem pode ver seu histórico agora, quantas vezes abriu e até quando. Segure o botão para revogar.</PageHeader>
      <Shares />
    </div>
  );
}

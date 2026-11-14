"use client";

import Link from "next/link";
import { toast } from "sonner";
import { DataPortability } from "@/components/DataPortability";
import { BackIcon, ChatIcon, ShieldIcon } from "@/components/icons";
import { DeleteMyData } from "@/components/ProfileSettings";
import { PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { resetChat } from "@/lib/chat";
import { shareState } from "@/lib/share";
import { revokeShare, useDb } from "@/lib/store";

/**
 * Gerenciar meus dados (estrutura da branch-plinio): cada ação no seu cartão,
 * as que apagam ou revogam pedem confirmação, e apagar tudo fica separado no fim.
 */
export default function DadosPage() {
  const db = useDb();

  return (
    <div>
      <Link href="/configuracoes" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-ink">
        <BackIcon width={20} /> Configurações
      </Link>
      {!db ? (
        <Skeleton lines={4} />
      ) : (
        <Content db={db} />
      )}
    </div>
  );
}

function Content({ db }: { db: NonNullable<ReturnType<typeof useDb>> }) {
  const active = db.shares.filter((s) => shareState(s) === "ativo");
  const counts = `${db.documents.length} laudos, ${db.labResults.length} resultados, ${db.encounters.length} consultas e ${db.vaccines.length} vacinas`;

  return (
    <>
      <PageHeader title="Gerenciar meus dados">Seu histórico fica salvo neste aparelho: {counts}.</PageHeader>

      <SectionTitle>Seus dados em outros sistemas</SectionTitle>
      <DataPortability />

      <SectionTitle>Remover</SectionTitle>
      <div className="space-y-2">
        <ActionCard
          icon={<ShieldIcon width={20} />}
          title="Revogar todos os acessos"
          text={active.length ? `${active.length} ${active.length === 1 ? "acesso ativo" : "acessos ativos"} de médicos, clínicas ou hospitais.` : "Nenhum acesso ativo agora."}
          action="Revogar"
          disabled={!active.length}
          onClick={() => {
            if (!confirm("Revogar todos os acessos? Quem tem o link deixa de ver seu histórico. Para compartilhar de novo, será preciso criar um novo acesso.")) return;
            for (const s of active) revokeShare(s.token);
            toast.success("Acessos revogados");
          }}
        />
        <ActionCard
          icon={<ChatIcon width={20} />}
          title="Apagar conversa com o Elo"
          text="Remove as mensagens. Seus exames e medições continuam salvos."
          action="Apagar"
          onClick={() => {
            if (!confirm("Apagar a conversa com o Elo? Não dá para desfazer.")) return;
            resetChat();
            toast.success("Conversa apagada");
          }}
        />
      </div>

      {/* Zona de perigo: separada do resto */}
      <SectionTitle>Zona de perigo</SectionTitle>
      <DeleteMyData />
    </>
  );
}

function ActionCard({
  icon,
  title,
  text,
  action,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="tile flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      <button type="button" onClick={onClick} disabled={disabled} className="btn-danger shrink-0 px-4">
        {action}
      </button>
    </div>
  );
}

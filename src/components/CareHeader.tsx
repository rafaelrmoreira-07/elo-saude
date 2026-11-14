import { AccessButton } from "./AccessButton";
import { SlidingTabs } from "./SlidingTabs";
import { PageHeader } from "./ui";

/** Cabeçalho da aba Médico: link para a consulta e pasta para a internação. Quem tem acesso fica num botão à parte. */
export function CareHeader({ active, children }: { active: "consulta" | "internacao"; children?: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Médico e hospital">{children}</PageHeader>
      <AccessButton />
      <div className="mb-6">
        <SlidingTabs
          label="Médico e hospital"
          memoryKey="cuidado"
          active={active}
          items={[
            { key: "consulta", label: "Médico", href: "/compartilhar" },
            { key: "internacao", label: "Hospital", href: "/internacao" },
          ]}
        />
      </div>
    </>
  );
}

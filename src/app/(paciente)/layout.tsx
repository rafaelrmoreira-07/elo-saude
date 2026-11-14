import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ChatLauncher } from "@/components/ChatLauncher";
import { ChatNotifier } from "@/components/ChatNotifier";
import { AppHealthAutoSync } from "@/components/HealthConnect";
import { ExamSearch } from "@/components/ExamSearch";
import { GearIcon, Logo } from "@/components/icons";
import { OnboardingGate } from "@/components/OnboardingGate";
import { PolicyUpdate } from "@/components/PolicyUpdate";

export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <a href="#conteudo" className="sr-only z-50 rounded-xl bg-ink px-4 py-3 text-[15px] font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white/95 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/" aria-label="Elo Saúde, início" className="-ml-1 flex min-h-11 items-center px-1">
          <Logo />
        </Link>
        <div className="flex items-center">
          <ExamSearch variant="icon" />
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface"
          >
            <GearIcon width={22} />
          </Link>
        </div>
      </header>
      <PolicyUpdate />
      <ChatNotifier />
      <AppHealthAutoSync />
      <ChatLauncher />
      <main id="conteudo" tabIndex={-1} className="flex-1 px-5 pb-32 pt-4 outline-none">{children}</main>
      <BottomNav />
      <OnboardingGate />
    </div>
  );
}

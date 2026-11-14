"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Endereço antigo da tela Sinais (/wearables). Leva para /sinais, para links
 * salvos e conversas antigas continuarem funcionando.
 */
export default function OldSignalsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/sinais/${window.location.search}${window.location.hash}`);
  }, [router]);
  return (
    <p className="p-8 text-center text-[15px] text-muted">
      Esta tela agora se chama <Link href="/sinais" className="font-medium text-ink underline underline-offset-4">Sinais</Link>.
    </p>
  );
}

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App do Elo Saúde para iPhone e Android: o mesmo site estático (pasta out/)
 * dentro de um app nativo, com leitura do Apple Saúde (HealthKit) e do
 * Health Connect. Passo a passo em docs/APP-MOVEL.md.
 */
const config: CapacitorConfig = {
  appId: "br.com.elosaude.app",
  appName: "Elo Saúde",
  webDir: "out",
  ios: { contentInset: "never" },
  android: { allowMixedContent: false },
};

export default config;

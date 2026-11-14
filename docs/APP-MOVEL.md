# App de iPhone e Android

O Elo vira app sem mudar o produto: o mesmo site estático (`out/`) roda dentro de um app nativo feito com o **Capacitor 8**. O que muda no app:

- **Apple Saúde (iPhone) e Health Connect (Android):** em Sinais e em Configurações › Aparelhos aparece "Conectar ao Apple Saúde" ou "Conectar ao Health Connect". O Elo lê os últimos 90 dias e atualiza sozinho ao abrir o app (se a última leitura tiver mais de 1 hora). Plugin: `@capgo/capacitor-health`.
- **Arquivos (PDF, Excel, FHIR):** no app, abrem a tela de compartilhar do celular em vez de baixar.
- **Link do relatório para o médico:** no app, aponta para o site público (`NEXT_PUBLIC_SITE_URL`, padrão `https://rafaelrmoreira-07.github.io/elo-saude`).

No site nada muda: a conexão só aparece dentro do app, e a importação de arquivo continua.

## O que é lido

| Dado | iPhone (Apple Saúde) | Android (Health Connect) |
|---|---|---|
| Batimento em repouso | sim | sim |
| Variabilidade cardíaca | sim (SDNN) | sim (RMSSD, cálculo diferente) |
| Sono | sim | sim |
| Saturação (menor do dia) | sim | sim |
| Passos | sim | sim |
| Pressão arterial | sim | sim |
| Ritmo irregular | não (o plugin ainda não lê) | não existe no Health Connect |
| Distúrbios respiratórios no sono | não (o plugin ainda não lê) | não existe no Health Connect |

Sem ritmo irregular e distúrbios respiratórios, os alertas de ritmo irregular e de apneia não disparam com dados do app; os de pressão e batimento em repouso, sim.

## Rodar no iPhone (Mac com Xcode)

1. `npm install`
2. `npm run app:ios` (gera o site, copia para o projeto e abre o Xcode).
3. No Xcode, alvo **App** › **Signing & Capabilities**:
   - Escolha o seu time (conta Apple; sem a conta paga dá para instalar só no seu iPhone).
   - Confira se a capacidade **HealthKit** está na lista (o arquivo `App.entitlements` já pede). Se não estiver, clique em **+ Capability › HealthKit**.
4. Conecte o iPhone e clique em ▶. O simulador não tem dados do Apple Watch; para testar a leitura, use um iPhone de verdade.

Textos de permissão (Saúde, câmera, fotos) já estão em `ios/App/App/Info.plist`.

## Rodar no Android (Android Studio)

1. `npm install`
2. `npm run app:android` (gera o site, copia e abre o Android Studio).
3. Clique em ▶ com o celular conectado (modo desenvolvedor ligado).
4. Android 14 ou mais novo já tem o Health Connect; nos anteriores, instale "Health Connect" na Play Store. Os dados aparecem se o app do relógio (Samsung Health, Fitbit, Garmin, Oura…) estiver ligado ao Health Connect.

Permissões em `android/app/src/main/AndroidManifest.xml`: só leitura dos 6 dados acima e do histórico (`READ_HEALTH_DATA_HISTORY`, para ler mais de 30 dias). As demais que o plugin declara foram removidas, para a revisão do Google Play.

## Antes de publicar nas lojas

- **Chave da Gemini:** no app ela pode ser extraída. O servidor pronto está em `server/ai-proxy` (Cloudflare Workers): publique-o, preencha `NEXT_PUBLIC_AI_PROXY_URL` no `.env.local` e deixe `NEXT_PUBLIC_GEMINI_API_KEY` vazia antes de gerar o app.
- **Política de privacidade:** `public/privacidade.html` (publicada em `/elo-saude/privacidade.html`). O Health Connect mostra esse endereço; a Apple pede o link no App Store Connect.
- **Apple:** conta Apple Developer (US$ 99/ano); explicar o uso do HealthKit na revisão.
- **Google:** conta Google Play (US$ 25, uma vez); preencher a declaração de permissões do Health Connect.
- **Ícones e tela de abertura:** já são os do Elo. iPhone: `ios/App/App/Assets.xcassets` (1024 sem transparência). Android: ícone adaptável em `mipmap-*` (frente com a marca, fundo azul do Elo) e versões antigas quadrada e redonda. Imagens para as lojas em `docs/loja/` (App Store 1024, Google Play 512).

## Atualizar o app depois de mudar o site

`npm run app:sync` (gera o site e copia para os dois projetos). Depois, rode de novo no Xcode ou no Android Studio.

# Servidor da IA (chave fora do app)

Para publicar nas lojas, a chave da Gemini não pode ir dentro do app. Este
servidor pequeno (Cloudflare Workers, plano gratuito) guarda a chave e repassa
os pedidos.

1. `npm i -g wrangler` e `wrangler login`
2. Crie a chave num projeto do Google Cloud **com faturamento ativo** (modo pago da
   Gemini API). No modo gratuito, o Google pode usar o conteúdo para melhorar os
   produtos e revisores humanos podem ler: não serve para dados de saúde.
   Nesta pasta: `wrangler secret put GEMINI_API_KEY` (cole a chave)
3. `wrangler deploy` → anote o endereço (ex.: `https://elo-saude-ia.<conta>.workers.dev`)
4. No `.env.local` do app (e no segredo do GitHub, para o site):
   `NEXT_PUBLIC_AI_PROXY_URL=https://elo-saude-ia.<conta>.workers.dev/models`
   e apague `NEXT_PUBLIC_GEMINI_API_KEY`.
5. Uso justo: `wrangler kv namespace create USO`, cole o id em `wrangler.toml`
   e ajuste `LIMITE_DIA` e `LIMITE_MES`. O usuário não vê os números; acima
   deles o servidor responde 429 e o app oferece digitar os valores à mão.
6. No painel da Cloudflare, crie também uma regra de limite de pedidos por IP
   (contra rajadas).

O servidor só aceita as origens de `ALLOWED_ORIGINS`, só os modelos usados
pelo app e pedidos de até 15 MB. Ele não guarda nem registra o conteúdo.

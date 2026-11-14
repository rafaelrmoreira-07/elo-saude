# Servidor da IA (chave fora do app)

Para publicar nas lojas, a chave da Gemini não pode ir dentro do app. Este
servidor pequeno (Cloudflare Workers, plano gratuito) guarda a chave e repassa
os pedidos.

1. `npm i -g wrangler` e `wrangler login`
2. Nesta pasta: `wrangler secret put GEMINI_API_KEY` (cole a chave)
3. `wrangler deploy` → anote o endereço (ex.: `https://elo-saude-ia.<conta>.workers.dev`)
4. No `.env.local` do app (e no segredo do GitHub, para o site):
   `NEXT_PUBLIC_AI_PROXY_URL=https://elo-saude-ia.<conta>.workers.dev/models`
   e apague `NEXT_PUBLIC_GEMINI_API_KEY`.
5. No painel da Cloudflare, crie uma regra de limite de pedidos por IP.

O servidor só aceita as origens de `ALLOWED_ORIGINS`, só os modelos usados
pelo app e pedidos de até 15 MB. Ele não guarda nem registra o conteúdo.

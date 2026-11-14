# Decisões do time e anotações da Rivio

Hackathon Gama House, Desafio Rivio. Time: Rafael, Matteo e Plinio. Registro atualizado em 14/11/2026.

## Linha do tempo das decisões

- **10–11/11:** plano inicial de construir do zero no Lovable um app chamado "Cerne" (veja `PROMPTS-DO-LOVABLE.md`). Com só 25 créditos por conta, o plano não cabia inteiro no Lovable.
- **12/11:** o time decidiu evoluir o site que o Matteo já tinha construído (Elo Saúde), sem sobrescrever o trabalho dele. Mudanças em branches, entrando no `main` só depois de o time validar.
- **13/11:** fechadas as lacunas apontadas pela Rivio (laudos de imagem, padronização visível, procedência de cada valor, cobertura do histórico).
- **14/11 de manhã:** versão final congelada para a apresentação (`2fd4af6` no repositório original).
- **14/11:** o código passou para este repositório, com histórico novo, para deixar de depender do fork e tirar da raiz arquivos que não eram do projeto.

## O que a versão final tem

- Redesenho do Matteo (branco, azul-marinho e laranja) e os apêndices A–H dele: pré-internação com glosas TISS, exames dos últimos 90 dias no médico, pós-alta, FHIR R4, consentimento para prontuário, contagem de correções, indicadores, resumo da alta, conversa flutuante e busca.
- Melhorias do time: revisão por confiança; até 5 laudos por vez; exame repetido e laudo duplicado; "Juntando seus dados"; personas nova/carlos/juliana/lucia/pedro; primeiro acesso vazio com guia; chat do Elo com Gemini; "Enviar pelo WhatsApp"; barra Hoje/Histórico/Enviar/Sinais/Médico; importação do relógio por arquivo (Apple Saúde, CSV, Google Takeout, IA); sinal "não medido"; origem dos dados no lugar do "Sincronizado".
- Ideias do Plinio, reescritas no código: tela do médico em linguagem clínica e em 3ª pessoa ("A considerar", sem prescrição); prazos de 90 dias e 1 ano; perfil de saúde e contato de emergência em Configurações; "Apagar meus dados"; o Elo entende "açúcar", "rins", "diabetes", "tireoide", "anemia"; `docs/CUSTO-IA.md`.
- Lacunas da Rivio resolvidas em 13/11:
  - **Laudos de imagem e procedimentos:** a IA reconhece laudo descritivo, copia a conclusão e resume os achados sem interpretar. Exemplo: ecocardiograma 2025 do Carlos.
  - **Padronização visível:** nomes reais por laboratório; "Mesmo exame, nomes diferentes"; no médico, cada gráfico diz de quantos locais e nomes veio; aviso de unidades diferentes (sem conversão).
  - **Procedência por valor:** cada valor sabe se ficou como a IA leu, se foi corrigido ou digitado.
  - **Cobertura do histórico:** período, laudos, locais, relógio, lacunas de 18 meses ou mais, o que não foi compartilhado. O exemplo "Foto difícil de ler" (2020) fecha a lacuna do Carlos ao vivo.
- Descartado: pedido de acesso iniciado pelo médico (o fluxo atual já cobre).

## Reuniões tira-dúvidas com a Rivio

- **Formato:** 5 min de apresentação + 5 min de perguntas. Envio até sábado 14/11 às 16h; apresentações a partir das 17h.
- **O que eles valorizam:** confiabilidade dos dados para o médico (maior valor); "uma tela que um médico olharia e pensaria: isso seria legal no meu dia a dia"; a maior dor é juntar o histórico; obstáculos em ordem: fragmentação → padronização → armazenamento → rede; foco; criatividade eficiente ("não precisa ser mirabolante").
- **Quem paga:** no início o paciente (B2C); depois hospitais, planos e laboratórios. O apêndice G diz "o paciente não paga": ajustar no pitch.
- **Regulação:** não há um "Bacen da saúde" (a ANS não tem esse papel); propor um modelo é bem-vindo. CFM: nada de diagnóstico nem prescrição.
- **Compartilhar histórico com planos por mensalidade menor:** arriscado pela regulação da ANS; usar só para preencher o questionário de saúde.

## Arquitetura (resumo)

Next.js 16 + React 19 + Tailwind 4, site estático, dados no navegador (localStorage + IndexedDB), Gemini chamada do navegador com a chave colocada em Configurações. Detalhes em `docs/ARQUITETURA.md` e `docs/LIMITACOES.md`.

## Regras do time

- Só dados sintéticos. Nenhum dado de pessoa real entra no repositório.
- Chave da Gemini: só em Configurações, nunca no código. Apagar a chave no AI Studio depois do evento.
- Nada de planilhas, apresentações ou documentos de fora do projeto na raiz do repositório (o `.gitignore` bloqueia).

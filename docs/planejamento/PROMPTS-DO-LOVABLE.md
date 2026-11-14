# Prompts do Lovable (plano original, 11–12/11/2026)

**Registro histórico.** Este era o plano para construir o app "Cerne" do zero no Lovable. Com só 25 créditos por conta, o plano de 9 prompts não cabia inteiro; o Prompt 1 chegou a ser colado em 11/11. Em 12/11 o time decidiu evoluir o código do Matteo (Elo Saúde). Os prompts 2 a 9 serviram de **especificação** das funcionalidades.

## Antes de começar

- Configuração: criar o projeto colando o Prompt 1; conectar o GitHub (botão GitHub no editor); ativar o backend (Lovable Cloud/Supabase).
- Chave do Gemini: quando pedida (Prompt 2), usar o formulário de Secrets com o nome `GEMINI_API_KEY`. Nunca colar a chave no chat do Lovable.
- Alternativa: Lovable AI (usa modelos Gemini, dispensa chave, gasta créditos do Lovable).
- Regras: um prompt de cada vez, com teste entre eles; usar o histórico de versões para desfazer; ao relatar erro, dizer o que fez, o que esperava e o que aconteceu; mudanças só visuais pela edição visual, sem gastar prompt.

## Prompt 1: a base do app (versão final, colada no Lovable em 11/11)

```text
Vamos construir CERNE, um hub de saúde pessoal para o Brasil. A pessoa junta num só lugar
exames (foto ou PDF), remédios, vacinas e dados de relógios/anéis inteligentes; a IA organiza
tudo numa linha do tempo; e, com consentimento, a pessoa compartilha o histórico com o médico,
como no open finance. Todo o app em português do Brasil. Funciona bem no celular e no computador.

Identidade visual (siga à risca). Defina tudo como tokens de design em index.css e
tailwind.config (variáveis do shadcn, convertendo os hex para HSL), sem cores soltas nos
componentes. Em textos da interface, escreva "Cerne" (só o C maiúsculo). Tom: calmo, claro e
confiável, de produto de saúde sério; nada infantil nem futurista. Fundo creme, nunca branco puro.

Cores (tema claro):
- background #F6F2EA; card e popover #FFFFFF; muted (áreas rebaixadas) #ECE6DA; border #D9D1C1;
  input (borda de campos) #7A8A85
- foreground #14211F; muted-foreground #4B5A56
- primary #0F4C45 (hover #0A3A35) com primary-foreground #FFFFFF
- accent suave (chips, item selecionado) #DDEBE6 com texto #0F4C45
- ring (foco de teclado, 2px) #1F5FA0
- destaque quente #A87636, só para decoração; nunca em texto nem em status
- Status, sempre com ícone e palavra, nunca só cor:
  Informativo: texto #1F5FA0 sobre #DCE9F6
  Atenção: texto #7A4F00 sobre #FBEFC9
  Urgente: texto #A8231B sobre #FBE1DE
- Faixa de referência nos gráficos: área #CFE4DD atrás da linha; linha do dado #0F4C45

Tema escuro (já deixe as variáveis em .dark e siga o tema do sistema): background #0E1A18;
card #15241F; muted #1C2E29; border #2B4039; foreground #EDEAE2; muted-foreground #A9B8B3;
primary #6CCDB7 com primary-foreground #07201B; Informativo #86B8EE sobre #132A44; Atenção
#F2C66B sobre #3A2B0A; Urgente #FF9A90 sobre #43181A; faixa #1E4A40.

Níveis de alerta e suas cores: "Informativo" usa Informativo; "Procure um médico em breve" usa
Atenção; "Procure atendimento agora" usa Urgente.

Regras de status: resultado DENTRO da faixa = ponto redondo na cor primary e selo "Dentro da
faixa". FORA da faixa = ponto em losango na cor de Atenção e selo "Acima da faixa" ou "Abaixo da
faixa" com ícone de triângulo. Vermelho (Urgente) só no alerta "Procure atendimento agora" e no
botão "Revogar acesso"; nunca num exame fora da faixa. Valor lido pela IA com baixa confiança:
fundo #FBEFC9 e o texto "Confira este valor".

Tipografia (Google Fonts): títulos (h1, h2 e o nome do produto) em Fraunces 600; todo o resto em
DM Sans 400, 500 e 600. Números de exame em DM Sans 600, com algarismos tabulares.

Forma: cantos de 12px em botões e alertas, 20px em cartões, formato pílula em selos. Sombra leve
só em cartão elevado e menu aberto; nas listas, divisórias na cor border. Ícones: lucide-react,
traço 1.75. Gráficos: Recharts (componentes de gráfico do shadcn). Textos em português do
Brasil, tratando a pessoa por "você", frases curtas, sem emoji e sem ponto de exclamação nos
alertas.

Logo: crie um componente Logo com este SVG (anéis de crescimento de um tronco, com uma abertura
no canto superior direito; a palavra é feita de traços). No tema escuro troque os anéis por
#D9A864, #4FA58F e #6CCDB7, o miolo por #B8F0E2 e a palavra por #EDEAE2. Use o mesmo
símbolo (só os anéis, viewBox 0 0 64 64) como favicon e no cabeçalho em telas pequenas.
<svg viewBox="0 0 260 64" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="4" stroke-linecap="round"><path d="M59.05 24.75A28 28 0 1 1 39.25 4.95" stroke="#A87636"/><path d="M50.35 27.08A19 19 0 1 1 36.92 13.65" stroke="#3F8574"/><path d="M41.66 29.41A10 10 0 1 1 34.59 22.34" stroke="#0F4C45"/></g><circle cx="32" cy="32" r="4" fill="#0A2E2A"/><g transform="translate(84 12)" fill="none" stroke="#0A2E2A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M30 8A17 17 0 1 0 30 32"/><path transform="translate(34 0)" d="M30 3H8V37H30M8 20H26"/><path transform="translate(68 0)" d="M8 37V3H20A9 9 0 0 1 20 21H8M20 21L30 37"/><path transform="translate(102 0)" d="M8 37V3L30 37V3"/><path transform="translate(136 0)" d="M30 3H8V37H30M8 20H26"/></g></svg>

Nesta primeira etapa, crie:

1. Login com e-mail e senha.
2. Perfis: uma conta pode ter vários perfis de paciente (ex.: "Eu" e "Minha mãe"), para o
   modo cuidador. Um seletor de perfil no topo.
3. Navegação com estas telas (por enquanto com estados vazios bem desenhados):
   - Início: resumo do perfil (últimos exames, alertas, próximos passos)
   - Linha do tempo: exames, consultas, remédios e vacinas em ordem cronológica
   - Exames: lista de marcadores (glicose, colesterol etc.) com gráfico de evolução
   - Relógio: batimento, sono e atividade
   - Compartilhar: acessos dados a médicos
   - Botão "Adicionar exame" sempre visível: no celular, botão flutuante no canto inferior
     direito; no computador, no cabeçalho
4. Banco de dados. Cada conta de login pode ter vários perfis de paciente: profiles guarda o
   user_id do dono, e TODAS as outras tabelas têm profile_id. A segurança (RLS) garante que só o
   dono dos perfis veja e altere esses dados. O storage dos documentos é privado. Tabelas:
   - profiles: user_id, nome, data de nascimento, sexo, alergias, contato de emergência
   - documents: arquivo original (foto ou PDF) guardado no storage, tipo, data, laboratório
   - lab_results: marcador, valor, unidade, ref_min, ref_max, data da coleta, laboratório,
     confiança (alta/média/baixa), confirmado pelo usuário (sim/não), document_id
   - appointments: data, médico, especialidade, observações
   - medications: nome, dose, frequência, início, fim
   - vaccines: nome, dose, data
   - wearable_daily: data, frequência cardíaca de repouso, horas de sono, passos,
     episódios de ritmo irregular
   - alerts: tipo, nível (informativo / procure um médico em breve / procure atendimento agora),
     mensagem, data, fonte
   - shares: token, escopo (quais categorias), expira em, revogado, nome do médico
   - access_logs: share_id, data e hora do acesso

Nesta etapa não use IA e não crie dados de exemplo no banco; os estados vazios bastam.

Importante: o app NUNCA dá diagnóstico. Ele organiza dados e indica quando procurar um médico.
Coloque esse aviso de forma discreta no rodapé.
```

## Prompt 2: extração com o Gemini (coração da demo)

Antes de usar, confirmar no AI Studio o nome do modelo Flash mais recente.

```text
Agora vamos ligar a IA. Crie uma função de servidor (edge function) chamada extract-lab-report
que chama a API do Google Gemini. A chave fica num segredo chamado GEMINI_API_KEY: me peça pelo
formulário de segredos. Ela nunca pode ir para o navegador.

Fluxo do botão "Adicionar exame":
1. O usuário tira uma foto (câmera do celular) ou envia uma imagem/PDF.
2. O arquivo é salvo no storage e vira um registro em documents.
3. A função envia o arquivo ao Gemini (modelo gemini-2.5-flash, endpoint generateContent da
   Generative Language API) com responseMimeType "application/json" e um responseSchema, pedindo:
   laboratorio, data_coleta (AAAA-MM-DD) e uma lista de resultados com: exame, valor (número),
   unidade, ref_min, ref_max, confianca (alta/media/baixa).
   Instruções para o modelo: "Você é um extrator de laudos laboratoriais brasileiros. Extraia só
   o que está escrito. Nunca invente valores. Se não tiver certeza de um número, marque confianca
   como baixa. Padronize o nome do exame para um destes quando corresponder: Glicose em jejum,
   Hemoglobina glicada (HbA1c), Colesterol total, LDL, HDL, Triglicerídeos, Creatinina, TSH,
   T4 livre, Hemoglobina, Leucócitos, Plaquetas, Vitamina D, Vitamina B12, Ferritina, TGO, TGP.
   Converta glicose em mmol/L para mg/dL. Se a faixa tiver só um limite (ex.: < 130 ou > 40),
   preencha só o lado correspondente e deixe o outro null. Se não conseguir ler um valor,
   devolva valor null com confianca baixa."
   Na revisão, um valor null aparece como campo vazio em amarelo ("Não consegui ler este valor");
   o usuário preenche ou descarta a linha, e nenhum resultado é salvo sem valor.
4. Mostre uma tela de revisão antes de salvar: cada valor numa linha, os de confiança baixa ou
   média destacados em amarelo com o texto "Confira este valor". Ao lado, a imagem do laudo
   original. O usuário pode corrigir e clicar em "Confirmar e salvar".
5. Salve em lab_results ligado ao document_id.
Mostre um carregamento com a mensagem "Lendo seu exame..." enquanto a IA trabalha e uma mensagem
de erro clara se falhar, com opção de tentar de novo.
```

Teste no AI Studio (11/11) aprovado com os 3 laudos sintéticos: valores corretos, faixas de um limite com null no outro lado, glicose sob carimbo devolvida como null + confiança baixa.

## Prompt 3: linha do tempo e gráficos

```text
Na tela Exames, para cada marcador mostre um gráfico de linha da evolução ao longo dos anos,
com a faixa de referência como uma área sombreada verde atrás da linha. Pontos dentro da faixa
em verde, fora dela em vermelho. Clicar num ponto abre o laudo original (a foto/PDF) daquele
resultado. Em cada marcador, mostre o último valor, a data e uma seta de tendência.

Na tela Linha do tempo, liste exames, remédios, vacinas e alertas em ordem cronológica,
com ícones diferentes por tipo e filtro por tipo.

Alerta de exame repetido: ao salvar um exame, se o mesmo marcador já tiver sido feito há menos
de 60 dias, mostre um aviso informativo: "Você já fez este exame em [data]. Vale mostrar o
resultado anterior ao seu médico antes de repetir."
```

Nota: as cores deste prompt foram escritas antes da identidade visual. Valem as regras do Prompt 1: fora da faixa = losango na cor de Atenção, nunca vermelho.

## Prompt 4: remédios, vacinas e linguagem simples

```text
Permita adicionar remédios e vacinas de duas formas: manualmente ou por foto (receita, caixa do
remédio ou carteira de vacinação). Para a foto, crie uma edge function extract-meds-vaccines
que usa o mesmo Gemini e a mesma chave, com saída JSON, e a mesma tela de revisão antes de salvar.

Ao lado de cada marcador de exame, coloque um botão "O que é isso?" que chama o Gemini e
mostra em 2 ou 3 frases simples o que aquele exame mede, sem interpretar o resultado da pessoa e
sem diagnosticar, terminando com "Converse com seu médico sobre o seu resultado". Guarde a
explicação para não chamar a IA de novo para o mesmo marcador.
```

Com o escopo reduzido (3 pessoas), remédios e vacinas entram só manualmente.

## Prompt 5: relógio e alertas

Os limites são regras de demonstração, a validar com estudantes de medicina e residentes.

```text
Na tela Relógio, permita importar um arquivo CSV com as colunas:
data,fc_repouso,sono_horas,passos,episodios_ritmo_irregular
(uma linha por dia; é o formato que vamos usar no lugar da integração com Apple Health/Google
Health Connect). Salve em wearable_daily.

Mostre três gráficos dos últimos 6 meses: frequência cardíaca de repouso, horas de sono e passos,
com os dias de ritmo irregular marcados no gráfico de frequência cardíaca.

Depois de cada importação, rode estas regras (código comum, não IA) e crie registros em alerts:
- Algum episódio de ritmo irregular nos últimos 14 dias -> nível "procure um médico em breve":
  "Seu relógio registrou ritmo cardíaco irregular em [n] dias. Leve isso ao seu médico."
- Média de FC de repouso dos últimos 30 dias pelo menos 10 bpm acima da média dos 90 dias
  anteriores -> nível "procure um médico em breve".
- Média de sono dos últimos 14 dias abaixo de 5,5 horas -> nível "informativo".
Os alertas aparecem no Início como cartões com cor pelo nível, data e um botão "Ver dados" que
abre o gráfico do período. Nunca use palavras de diagnóstico (como "arritmia" ou "fibrilação").
```

## Prompt 6: insight cruzado e resumo pré-consulta

```text
Crie uma edge function generate-insights que junta, do perfil: os alertas do relógio, os
resultados de exame fora da faixa ou com tendência de piora, os remédios em uso e as vacinas.

1. Insight cruzado: quando um alerta do relógio e um exame alterado acontecem no mesmo período
   (até 6 meses), envie os dois ao Gemini e mostre no Início um cartão destacado "Juntando seus
   dados" com 2 ou 3 frases que conectam os dois fatos SEM diagnosticar, terminando com uma
   orientação de procurar o médico. Exemplo de tom: "Sua frequência cardíaca de repouso subiu
   12 bpm desde agosto, e seu último TSH (março) estava abaixo da faixa. Vale levar os dois
   dados juntos para seu médico." Cada fato citado é um link para o gráfico ou laudo de origem.
2. Resumo pré-consulta: um botão "Preparar consulta" gera, com o Gemini, um resumo de uma
   página para o médico: dados do paciente, alergias, remédios em uso, exames alterados e
   tendências, alertas do relógio, vacinas e 3 perguntas sugeridas para o paciente fazer.
   Cada item cita a fonte (data e laboratório, ou período do relógio). Guarde o resumo gerado.
```

## Prompt 7: consentimento, visão do médico e revogação (momento mais forte da demo)

```text
Na tela Compartilhar, crie o fluxo de consentimento, inspirado no open finance:
1. O paciente clica em "Compartilhar com um médico", informa o nome do médico, escolhe o
   escopo (caixas: Exames, Remédios, Vacinas, Dados do relógio, Resumo pré-consulta) e o prazo
   (24 horas, 7 dias, 30 dias).
2. Uma tela de confirmação resume em linguagem simples o que será compartilhado, com quem e até
   quando. Ao confirmar, gera um token seguro em shares e mostra um link e um QR code.
3. A lista de acessos mostra cada compartilhamento com status (ativo, expirado, revogado), um
   botão vermelho "Revogar acesso" e o histórico de cada vez que o médico abriu (access_logs).

Visão do médico: uma página pública /medico/[token] que NÃO exige login. Ela busca os dados
por uma edge function que valida o token (existe, não expirou, não foi revogado), devolve só as
categorias do escopo e registra o acesso em access_logs. Layout de uma tela só, pensado para
notebook: cabeçalho com paciente, idade, alergias e validade do acesso; resumo pré-consulta no
topo; depois exames alterados com mini gráficos, remédios, alertas do relógio e vacinas. Cada
dado tem link para o laudo original.

Revogação ao vivo: a página do médico escuta mudanças em tempo real (realtime) no registro do
share. Quando o paciente revoga, a tela do médico troca na hora, sem recarregar, por uma
mensagem "O paciente encerrou este acesso".
```

## Prompt 8: WhatsApp Nível 1 e cartão de emergência

```text
1. Depois de gerar um compartilhamento, adicione o botão "Enviar pelo WhatsApp" que abre
   https://wa.me/?text= com a mensagem: "Olá, Dr(a). [nome]. Segue o acesso ao meu histórico de
   saúde pelo Cerne, válido até [data]: [link]". Faça o mesmo nos cartões de alerta: "Enviar
   para um familiar".
2. Cartão de emergência: no perfil, um botão gera um QR code que abre uma página pública com
   só o essencial para uma emergência: nome, alergias, remédios em uso e contato de emergência.
   O paciente escolhe o que aparece e pode desativar o QR quando quiser.
```

WhatsApp Nível 2 (receber exame pelo WhatsApp Cloud API): **fora do escopo desde 11/11** (3 pessoas e poucos créditos); vira slide de próximos passos.

## Prompt 9: modo demo

```text
Crie uma área escondida /demo (só para o nosso usuário de teste) com dois botões:
1. "Carregar persona": importa o histórico completo de uma persona a partir de arquivos que vou
   enviar (exames em JSON com os laudos originais em imagem, remédios, vacinas e o CSV do
   relógio), gerando a linha do tempo, os gráficos e os alertas como se tivessem sido enviados
   ao longo dos anos.
2. "Zerar demo": apaga os dados da persona e todos os compartilhamentos, para ensaiar de novo.
No topo do app, quando um perfil for de persona, mostre um selo discreto "Dados sintéticos".
```

## Roteiro de teste

| Prompt | Teste | Passou quando |
| --- | --- | --- |
| 1 | Criar conta, criar perfil "Minha mãe", navegar por todas as telas no celular | Nenhuma tela quebrada; cada perfil vê só os próprios dados |
| 2 | Fotografar um laudo sintético e um laudo difícil | Valores certos; os duvidosos aparecem em amarelo |
| 3 | Enviar 3 laudos do mesmo marcador de anos diferentes | Gráfico com faixa; clicar no ponto abre o laudo; aviso de exame repetido aparece |
| 4 | "O que é isso?" num marcador | Explicação sem diagnóstico |
| 5 | Importar o CSV da persona Carlos | Gráficos aparecem; alerta de ritmo irregular no Início |
| 6 | Importar os dados da persona Juliana | Cartão "Juntando seus dados" com FC + TSH e links para as fontes |
| 7 | Compartilhar em dois notebooks, abrir como médico e revogar | Tela do médico bloqueia sozinha em poucos segundos; acesso aparece no histórico |
| 8 | Botão do WhatsApp no celular + ler o QR de emergência | Mensagem pronta no WhatsApp; QR abre só o essencial |
| 9 | Carregar persona, zerar e carregar de novo | Volta ao mesmo estado nas duas vezes |

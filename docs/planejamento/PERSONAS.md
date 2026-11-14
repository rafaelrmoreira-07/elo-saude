# Personas

Todas as personas são fictícias, e todos os dados delas são sintéticos. Escritas em 12/11/2026, quando o app ainda se chamava "Cerne"; no app atual, Carlos é a persona principal da demo.

## Visão geral

Carlos é a persona da demo; as outras três existem para testar o que a história dele não cobre. Nomes, laboratórios e médicos são inventados.

| Persona | Quem é | Fontes de dados | O que testa |
| --- | --- | --- | --- |
| Carlos Menezes, 61 | Engenheiro aposentado em Campinas, hipertenso, glicemia subindo, filha Ana cuida dos exames | 10 anos de laudos em papel e PDF de 3 laboratórios, Apple Watch, receitas | Demo de ponta a ponta: extração, gráficos, alerta de ritmo irregular, exame repetido, médico, revogação |
| Juliana Rocha, 34 | Advogada em São Paulo, rotina puxada, usa um anel de sono | PDFs digitais, anel inteligente | Insight cruzado: FC de repouso subindo + TSH abaixo da faixa |
| Lúcia Ferreira, 78 | Mãe de Carlos e avó de Ana, que cuida do perfil dela na mesma conta; mora em Maceió | Laudos antigos em papel amassado, carteira de vacinação, sem relógio | Modo cuidador, extração de laudo difícil, confiança baixa, vacinas por foto |
| Pedro Lima, 22 | Estudante da Unicamp, joga futebol, saudável | 2 exames recentes, Galaxy Watch | Primeiro uso, tudo dentro da faixa, nenhum alerta falso |

## Carlos Menezes, 61: a persona da demo

**A história em 30 segundos:** Carlos tem uma pasta de exames em papel de 10 anos, feitos em três laboratórios. A filha Ana fotografa tudo no app. A glicemia dele vem subindo devagar há anos e ninguém juntou os pontos. Em outubro, o Apple Watch registra ritmo cardíaco irregular em 3 dias. O app avisa para procurar um médico, Carlos compartilha o histórico com a cardiologista Dra. Helena Prado por 7 dias e, depois da consulta, revoga o acesso.

**Perfil:** 61 anos, masculino, engenheiro aposentado, Campinas (SP). Nascimento 12/02/1965. Alergia: dipirona. Contato de emergência: Ana Menezes (filha).

**Exames** (laboratórios fictícios: Lab Aurora, LaborVida e Clínica Pátio Diagnósticos):

| Data | Laboratório | Formato | Glicose em jejum (70–99 mg/dL) | HbA1c (abaixo de 5,7%) | LDL (abaixo de 130 mg/dL) | Outros |
| --- | --- | --- | --- | --- | --- | --- |
| 28/10/2026 | Clínica Pátio | PDF | 124 | | | Hemoglobina 14,4 g/dL (exame repetido) |
| 15/09/2026 | Clínica Pátio | PDF | 126 | 6,4 | 98 | Hemoglobina 14,6 g/dL; Creatinina 1,1 mg/dL |
| 20/08/2024 | LaborVida | PDF | 118 | 6,1 | 105 | |
| 10/11/2022 | LaborVida | Papel | 112 | 5,9 | 112 | Creatinina 1,0 mg/dL |
| 14/09/2020 | Lab Aurora | Papel | 104 | 5,7 | 128 | |
| 22/05/2018 | Lab Aurora | Papel | 99 | | 136 | |
| 08/03/2016 | Lab Aurora | Papel (amarelado) | 94 | | 142 | Laudo sintético gerado também traz Colesterol total 221, HDL 48, Triglicerídeos 155 |

**Remédios:** Losartana 50 mg, 1 vez ao dia, desde 2019. Sinvastatina 20 mg, 1 vez ao dia, desde 2021 (por isso o LDL melhora).

**Vacinas:** dT (2019), COVID-19 reforço (10/2025), Influenza (04/2026).

**Relógio** (Apple Watch desde 05/2025, CSV de 6 meses): FC de repouso estável entre 62 e 66 bpm; sono de 6 a 7 h; 6 a 8 mil passos por dia; ritmo irregular registrado em 21/10, 29/10 e 04/11/2026.

**O que a demo mostra com ele:** foto ao vivo do laudo de 2016 → glicose de 10 anos num gráfico cruzando a faixa → aviso de hemograma repetido em 6 semanas → alerta de ritmo irregular → compartilhar com a Dra. Helena pelo WhatsApp → visão da médica → revogação ao vivo.

## Juliana Rocha, 34: o insight cruzado

**A história:** em março, um check-up mostrou o TSH abaixo da faixa, mas Juliana estava em semana de prova da OAB e não voltou ao médico. Desde agosto, o anel registra a frequência cardíaca de repouso subindo e o sono piorando. Separados, os dois dados passam batido. Juntos, o app sugere levar os dois ao médico. É o argumento central de reunir tudo num hub.

**Perfil:** 34 anos, feminino, advogada, São Paulo (SP). Sem alergias. Remédio: anticoncepcional oral contínuo. Vacinas: HPV (esquema completo), Influenza (05/2026).

**Exames** (todos em PDF digital, laboratório fictício Lab Aurora):

| Data | TSH (0,4–4,0 mUI/L) | T4 livre (0,9–1,7 ng/dL) | Hemoglobina (12–16 g/dL) |
| --- | --- | --- | --- |
| 12/03/2026 | 0,2 | 1,9 | 13,1 |
| 18/03/2025 | 1,5 | 1,3 | 13,4 |
| 20/02/2024 | 1,8 | 1,2 | 13,2 |

**Anel de sono** (desde 06/2025, CSV de 6 meses): FC de repouso entre 60 e 63 bpm até julho de 2026, subindo de forma gradual até 74–76 bpm em outubro; sono caindo de cerca de 7 h para 5,8 h; passos estáveis em torno de 9 mil; nenhum episódio de ritmo irregular.

**O que dispara:** a regra de FC de repouso (média de 30 dias pelo menos 10 bpm acima dos 90 dias anteriores) + o TSH fora da faixa em 2026 = o cartão "Juntando seus dados".

## Lúcia Ferreira, 78, e Pedro Lima, 22: os casos de borda

**Lúcia: modo cuidador e laudo difícil.** Ana gerencia três perfis na mesma conta: o dela, o do pai (Carlos) e o da avó. Os laudos de Lúcia são o teste de estresse da extração: papel amassado, foto torta, carimbo por cima de um número. O esperado é a IA marcar esses valores em amarelo, e não chutar. Nascimento 03/07/1948.

| Data | Laboratório | Formato | Resultados (faixa impressa no laudo) |
| --- | --- | --- | --- |
| 05/06/2023 | LaborVida | Papel amassado, foto torta | Hemoglobina 11,8 g/dL (12–16); Creatinina 1,2 mg/dL (0,6–1,1); Vitamina D 22 ng/mL (30–100) |
| 17/04/2019 | Lab Aurora | Papel com carimbo sobre a glicose | Glicose em jejum 101 mg/dL (70–99), com o número coberto: deve sair null/confiança baixa. O laudo sintético gerado também traz Hemoglobina 12,3 g/dL (12,0–16,0), Creatinina 1,0 mg/dL (0,6–1,1) e TSH 3,1 mUI/L (0,4–4,0) |

Remédio: Levotiroxina 50 mcg em jejum. Vacinas, por foto da carteira de vacinação: Pneumocócica 23 (2022), Herpes-zóster (2024), COVID-19 reforço (2025), Influenza (2026). Sem relógio: a tela Relógio precisa mostrar um estado vazio bem feito.

**Pedro: o caso sem alertas.** Estudante da Unicamp, joga futebol 4 vezes por semana. Dois exames de rotina em 2026 (fevereiro e agosto), todos dentro da faixa. No Galaxy Watch, FC de repouso de 50 a 54 bpm (comum em quem treina), cerca de 12 mil passos por dia e sono de 7,5 h. O teste é negativo: nenhum alerta deve aparecer, e uma FC de repouso baixa e estável não pode disparar aviso. Também serve para testar o primeiro uso (onboarding) do zero.

**Regra:** nenhum dado de pessoa real entra no app de teste. Quem quiser testar com o próprio exame pode, mas apaga antes da demo.

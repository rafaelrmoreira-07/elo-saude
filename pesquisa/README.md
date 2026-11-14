# Pesquisa e métricas do Elo Saúde

Esta pasta reúne a pesquisa feita para o hackathon: modelo de negócio, custos de IA, margens, fontes e o plano de lançamento nas lojas. Não é código e não faz parte do app.

Todos os documentos são de 14/11/2026. Salvo quando indicado, os números são **hipóteses do modelo**, não resultados medidos com usuários.

## Por onde começar

1. [Modelo de negócio e custos](negocio-e-metricas/Elo-Saude-modelo-de-negocio-e-custos.pdf): o documento principal. Fases do negócio, planos, custo de IA, margens, ponto de equilíbrio e comparação com empresas parecidas.
2. [Fontes das métricas](negocio-e-metricas/Elo-Saude-fontes-das-metricas.pdf): a conferência do documento acima. Refaz as contas e mostra a situação de cada fonte (confirmada, com ressalva, a corrigir ou ainda hipótese).

## Negócio e métricas

| Documento | O que responde | Formatos |
|---|---|---|
| Modelo de negócio e custos | Como o Elo ganha dinheiro, quanto custa e quando empata | [PDF](negocio-e-metricas/Elo-Saude-modelo-de-negocio-e-custos.pdf) |
| Fontes das métricas | De onde vem cada número e o que já foi confirmado | [PDF](negocio-e-metricas/Elo-Saude-fontes-das-metricas.pdf) |
| Custo de IA e margem | Custo por pedido à IA e margem por plano, no uso típico e no limite de uso justo | [PDF](negocio-e-metricas/Elo-Saude-custo-IA-e-margem.pdf) · [Word](negocio-e-metricas/Elo-Saude-custo-IA-e-margem.docx) |
| Custo da IA (levantamento inicial) | Custo de cada chamada à Gemini por modelo; base dos documentos acima | [PDF](negocio-e-metricas/Elo-Saude-custo-IA.pdf) · [Word](negocio-e-metricas/Elo-Saude-custo-IA.docx) |
| Indicadores de resultado | O que medir para hospitais e planos de saúde pagarem pelo resultado (fase B2B) | [PDF](negocio-e-metricas/Elo-Saude-indicadores.pdf) · [Word](negocio-e-metricas/Elo-Saude-indicadores.docx) |

## Lançamento

| Documento | O que responde | Formatos |
|---|---|---|
| Lançamento do app no iPhone e no Android | O que já está pronto, o que falta e o prazo para publicar nas lojas | [PDF](lancamento/Elo-Saude-lancamento-app.pdf) · [Word](lancamento/Elo-Saude-lancamento-app.docx) |

## Como ler os números

- **Cenário base.** O ponto de equilíbrio usado é o do cenário com dados de mercado: 2,1% de conversão, 10% de cancelamento por mês e 216 assinantes para empatar. O cenário de 178 assinantes é o otimista.
- **Levantamento inicial.** O custo da IA foi refeito depois do levantamento inicial. Quando os números divergem, valem os do modelo de negócio e do documento de custo e margem.
- **Refazer as contas.** A conta inteira está em [`docs/modelo-de-negocio/modelo.py`](../docs/modelo-de-negocio/modelo.py): mude uma premissa e rode `python3 modelo.py`.

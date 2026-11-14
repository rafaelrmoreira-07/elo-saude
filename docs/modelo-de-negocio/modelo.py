"""Modelo de custo e rentabilidade do Elo Saúde (hipóteses de 14/11/2026)."""
USD = 5.55  # R$ por US$ (dólar ~R$ 5,51-5,56 em 09-11/11/2026)

# Preços Gemini, US$ por 1M tokens (entrada, saída). Saída inclui tokens de "pensamento".
FLASH = (1.50, 9.00)       # gemini-3.5-flash (o que o app usa hoje)
LITE = (0.30, 2.50)        # gemini-3.5-flash-lite
LITE_BATCH = (0.15, 1.25)  # lote, 50% off (histórico antigo, sem pressa)

# Tokens por operação (entrada, saída+pensamento)
OPS = {
    "laudo": (2500 + 1100 * 1.5, 1500 + 800),  # prompt+catálogo, ~1,5 página, JSON + pensamento baixo
    "msg": (4000, 600),                         # contexto do histórico + resposta curta
    "resumo": (5000, 1500),                     # resumo para o médico
}


def usd(op, model):
    i, o = OPS[op]
    return (i * model[0] + o * model[1]) / 1e6


def custo_op(op, rota):
    """rota 'flash' = tudo no Flash (hoje). 'mista' = Lite e 20% dos laudos repetidos no Flash."""
    if rota == "flash":
        return usd(op, FLASH)
    if op == "laudo":
        return usd(op, LITE) + 0.20 * usd(op, FLASH)
    return usd(op, LITE)


def custo_mes(uso, rota):
    return sum(custo_op(op, rota) * n for op, n in uso.items()) * USD


PERFIS = {
    "Gratuito (uso típico, 50% da cota)": {"laudo": 2.5, "msg": 10, "resumo": 1},
    "Gratuito (cota cheia)": {"laudo": 5, "msg": 20, "resumo": 2},
    "Individual típico": {"laudo": 2, "msg": 30, "resumo": 2},
    "Individual pesado (teto de uso justo)": {"laudo": 30, "msg": 300, "resumo": 20},
    "Família típica (3 perfis ativos)": {"laudo": 6, "msg": 70, "resumo": 5},
    "Família pesada (5 perfis, teto)": {"laudo": 60, "msg": 500, "resumo": 40},
}

print("== Custo unitário por operação (R$) ==")
for op in OPS:
    print(f"{op:7s} flash R$ {usd(op, FLASH)*USD:.4f} | lite R$ {usd(op, LITE)*USD:.4f} | mista R$ {custo_op(op,'mista')*USD:.4f}")
print(f"Laudo antigo em lote (lite batch): R$ {usd('laudo', LITE_BATCH)*USD:.4f}")

print("\n== Custo de IA por mês (R$) ==")
for nome, uso in PERFIS.items():
    print(f"{nome:42s} flash {custo_mes(uso,'flash'):6.2f} | mista {custo_mes(uso,'mista'):6.2f}")

# Digitalizar o histórico antigo (uma vez só)
for n, quem in [(30, "Individual"), (90, "Família")]:
    print(f"Histórico inicial {quem} ({n} laudos): flash R$ {n*usd('laudo',FLASH)*USD:.2f} | lote lite R$ {n*(usd('laudo',LITE_BATCH)+0.2*usd('laudo',FLASH))*USD:.2f}")

# ---- Receita e margem por assinante ----
PRECO = {"Individual": 14.90, "Família": 29.90}
ANUAL = {"Individual": 149.00, "Família": 299.00}
# Mix de pagamento: 50% loja de apps (15%), 30% cartão na web (3,99% + R$ 0,39), 20% Pix (1,19%)
def taxa_pag(p):
    return 0.5 * 0.15 * p + 0.3 * (0.0399 * p + 0.39) + 0.2 * 0.0119 * p
IMPOSTO = 0.06   # Simples Nacional, Anexo III, faixa inicial (confirmar com contador; pode ser 15,5%)
INFRA_VAR = 0.05  # R$/assinante/mês: armazenamento de laudos, e-mail, logs

USO_TIPICO = {"Individual": PERFIS["Individual típico"], "Família": PERFIS["Família típica (3 perfis ativos)"]}
print("\n== Margem de contribuição por assinante/mês (rota mista, uso típico) ==")
margem = {}
for plano, p in PRECO.items():
    ia = custo_mes(USO_TIPICO[plano], "mista")
    pag = taxa_pag(p)
    imp = IMPOSTO * p
    m = p - ia - pag - imp - INFRA_VAR
    margem[plano] = m
    print(f"{plano:10s} preço {p:5.2f} | IA {ia:4.2f} | pagamento {pag:4.2f} | imposto {imp:4.2f} | margem {m:5.2f} ({m/p:.0%})")
    ia_f = custo_mes(USO_TIPICO[plano], "flash")
    print(f"           com tudo no Flash: IA {ia_f:4.2f} -> margem {p-ia_f-pag-imp-INFRA_VAR:5.2f}")
    ia_h = custo_mes(PERFIS["Individual pesado (teto de uso justo)" if plano=="Individual" else "Família pesada (5 perfis, teto)"], "mista")
    print(f"           usuário no teto (mista): IA {ia_h:4.2f} -> margem {p-ia_h-pag-imp-INFRA_VAR:5.2f}")

# ---- Base gratuita e ponto de equilíbrio ----
CONV = 0.04            # gratuito -> pago
MIX = {"Individual": 0.65, "Família": 0.35}
CHURN = 0.06           # cancelamento mensal
FIXO = 2400            # R$/mês: infra base (~US$ 60), contador, LGPD/encarregado terceirizado, seguro, contas de loja
ATIVOS_GRATIS = 0.30   # parte da base gratuita que usa a IA num mês qualquer

m_media = sum(MIX[k] * margem[k] for k in MIX)
custo_gratis_mes = custo_mes(PERFIS["Gratuito (uso típico, 50% da cota)"], "mista") * ATIVOS_GRATIS
gratis_por_pagante = (1 - CONV) / CONV
m_liquida = m_media - gratis_por_pagante * custo_gratis_mes
print(f"\nMargem média por pagante: R$ {m_media:.2f}")
print(f"Custo da base gratuita por pagante: {gratis_por_pagante:.0f} gratuitos x R$ {custo_gratis_mes:.3f} = R$ {gratis_por_pagante*custo_gratis_mes:.2f}")
print(f"Margem líquida por pagante: R$ {m_liquida:.2f}")
be = FIXO / m_liquida
print(f"Ponto de equilíbrio: {be:.0f} pagantes ~ {be/CONV:,.0f} usuários cadastrados")
ltv = m_liquida / CHURN
print(f"LTV (churn {CHURN:.0%}/mês): R$ {ltv:.0f}  -> CAC máximo saudável (LTV/3): R$ {ltv/3:.0f}")

print("\n== Cenários de base (mês) ==")
for base in [1_000, 10_000, 50_000, 200_000]:
    pag = base * CONV
    receita = pag * sum(MIX[k] * PRECO[k] for k in MIX)
    fixo = FIXO + (0 if base < 50_000 else 1200 if base < 200_000 else 4000)
    res = pag * m_liquida - fixo
    print(f"{base:>8,} usuários | {pag:>6,.0f} pagantes | receita R$ {receita:>9,.0f} | resultado R$ {res:>9,.0f}")

# Sensibilidade: conversão e preço
print("\n== Sensibilidade: pagantes para empatar ==")
for conv in [0.02, 0.04, 0.06]:
    g = (1 - conv) / conv * custo_gratis_mes
    print(f"conversão {conv:.0%}: {FIXO/(m_media-g):.0f} pagantes, {FIXO/(m_media-g)/conv:,.0f} usuários")

print("\n== Com pró-labore de 3 sócios (R$ 5.000 cada) ==")
fixo2 = FIXO + 15000
be2 = fixo2 / m_liquida
print(f"Fixo R$ {fixo2:,.0f} -> {be2:,.0f} pagantes ~ {be2/CONV:,.0f} usuários")
print("\n== Preço alternativo (R$ 12,90 / R$ 24,90) ==")
for plano, p in {"Individual": 12.90, "Família": 24.90}.items():
    ia = custo_mes(USO_TIPICO[plano], "mista")
    print(plano, round(p - ia - taxa_pag(p) - IMPOSTO*p - INFRA_VAR, 2))

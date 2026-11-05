# ADR 0002 — Calibração dos limites do Claude: % estimado pelo gasto em US$

- **Status:** aceito (combinado no plano aprovado da S13)
- **Data:** 2026-11-04
- **Harness:** 0.14.0

## Contexto

O painel mostra o % da janela de 5 h e da semana do Claude. Retorno de Daniel em 2026-11-04: o número trava antes de 100% e, depois do reset, chega a ~150%. O cálculo antigo usava `H5_USD = 17` e somava as últimas 5 h de gasto mesmo depois do reset.

## O que a documentação diz

- A API do Claude não expõe os limites de uso em tempo real. O painel só tem o último `usage.limits`, gravado na tabela `limit_window`, que a statusline emite.
- Perto do limite a statusline para de emitir, então o último valor envelhece. O painel só vê os transcripts do Claude Code e esse último valor; não vê o uso feito no claude.ai ou em outra máquina.
- Calibração de 2026-11-04: regressão de ~250 leituras reais cruzadas com ~33,5 mil mensagens dos transcripts (só modelos Claude).

## Alternativas avaliadas

1. **Manter `H5_USD = 17`:** nada a mudar. Mas a regressão mostra que a janela de 5 h vale ~US$ 30; com 17 o % sobe quase o dobro do real, e perto do limite passa de 100%.
2. **Só mostrar o último valor lido:** simples e sem estimativa. Mas trava: com o limite quase cheio, o número fica parado enquanto o uso continua.
3. **Regressão com leituras reais (escolhida):** os números vêm de dados medidos, com R² 0,97 (5 h) e 0,995 (semana). A estimativa anda com o gasto novo e se corrige a cada leitura.

## Decisão

- **Janela de 5 h:** `H5_USD ≈ 30`. 1% ≈ US$ 0,30 (3,31 pontos por US$ da API).
- **Semana:** `WEEK_USD ≈ 227`. 1% ≈ US$ 2,27 (0,44 ponto por US$ da API).
- **Estimativa:** % = % do último valor + k × US$ gastos desde essa leitura, com k = 100 / `H5_USD` (5 h) ou 100 / `WEEK_USD` (semana). O resultado é marcado "estimado" e tem teto de 100.
- **Depois do `resets_at`:** o % parte de zero e conta só o gasto desde o reset. Nunca usa as últimas 5 h, que incluem gasto de antes do reset. A semana também ganha estimativa.
- **Turno `limit` depois do último valor:** mostra 100% até o `resets_at`.
- **Peso por tipo de token (aproximado):** cache lido ~50%, cache escrito ~30%, saída ~15%, entrada ~0. Esses pesos ficam na calibração; não são medidos por tipo separadamente.
- As constantes `H5_USD` e `WEEK_USD` ficam nomeadas em `server/data.ts`, com comentário apontando para esta ADR.

## Consequências

- O painel mostra um % útil perto do limite e não passa de 100%. Depois do reset, o número volta a ~0 e cresce com o gasto novo.
- O % é inteiro.
- Uso fora dos transcripts (claude.ai, outra máquina) fica invisível e o % sai baixo nesses casos.
- Margem de erro de ~3 pontos na janela de 5 h e de ~1 ponto na semana.
- Cache de 5 min e de 1 h não se distinguem nos dados; o peso é único para escrita de cache. A escrita pesa ~2× o que a tabela da API prevê.
- A constante pode ser refeita com mais leituras. Se a regressão mudar, troca-se `H5_USD` e `WEEK_USD` e atualiza-se esta ADR.

# S13 — Limite sem travar e consumo por tipo, sprint, tarefa e agente

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.14.0
- **Status:** aguardando aprovação

## Objetivo

O painel para de travar e de mostrar % absurda perto do limite do Claude, e passa a mostrar quanto cada sprint, tarefa e agente consumiu em **%, US$ e tokens por tipo** (entrada, saída, cache lido, cache escrito), na Sala de controle e na tela Consumo (com acordeão por sprint).

## Diagnóstico (retorno de Daniel, 2026-11-04)

1. **Trava antes de 100%:** o único dado do limite é o último `usage.limits` (tabela `limit_window`). Perto do limite a statusline para de emitir, então o número fica velho. O painel não estima o gasto depois do último valor e não usa o turno `limit` (erro de rate limit).
2. **~150% depois que o limite volta:** passado o `resets_at`, `limit()` em `server/data.ts` devolve nada. O plano B soma as **últimas 5 h** de gasto (inclui o gasto de antes do reset) e divide por `H5_USD = 17`, passando de 100%. A semana vira "sem dado".
3. **Calibração (regressão em ~250 leituras reais cruzadas com ~33,5 mil mensagens dos transcripts, só modelos Claude):**
   - 5 h: % ≈ 3,31 × US$ da API (R² 0,97). 1% ≈ US$ 0,30; a janela inteira ≈ **US$ 30** (hoje o código usa 17).
   - Semana: % ≈ 0,44 × US$ da API (R² 0,995). 1% ≈ US$ 2,27; a semana ≈ **US$ 227**. A janela de 5 h ≈ 13% da semana.
   - Peso na cota (aprox.): cache lido ~50%, cache escrito ~30%, saída ~15%, entrada ~0. A escrita de cache pesa ~2× o que a tabela da API prevê; 5 min e 1 h não se distinguem.
   - Limites do método: % inteiro; uso no claude.ai ou em outra máquina não aparece nos transcripts; margem ~3 pontos na janela de 5 h e ~1 na semana. A constante pode ser refeita com mais dados.

## Escopo

1. **Limite confiável (T01):**
   - Estimativa = % do último valor + k × US$ gasto desde ele (marcada "estimado"), com k da calibração; teto 100.
   - Depois do `resets_at`: estimar pelo gasto desde esse instante (nunca pelas últimas 5 h); a semana também ganha estimativa.
   - Turno `limit` depois do último valor: mostra 100% até o `resets_at`.
   - `H5_USD` ≈ 30 e novo `WEEK_USD` ≈ 227 (constantes nomeadas, comentário apontando a ADR).
2. **ADR da calibração (T05):** registra o método, os números e as limitações.
3. **Consumo por tipo (T02, servidor):** para cada sprint, tarefa e agente: tokens de entrada, saída, cache lido, cache escrito, US$ e % (da janela de 5 h e da semana, com a calibração). Tarefa recebe o uso do agente que a executou (`agentId`), ou da janela início–fim.
4. **Sala de controle (T03):** cards "Consumo" e "Agentes" e a tabela de tarefas mostram %, US$ e tokens por tipo.
5. **Tela Consumo (T04):** mesma visibilidade e acordeão "Por sprint" (tarefas e agentes dentro), ao lado do "Por data".

## Fora de escopo

- Medir 5 min × 1 h de cache separadamente (não distinguível nos dados).
- Uso de outras máquinas ou do claude.ai (o painel só vê os transcripts).
- Guardar histórico de todas as leituras de limite (só a última, como hoje).
- Gemini e demais externos: seguem à parte, US$ 0.

## Critérios de aceite

1. Com o último valor velho e gasto depois dele, o limite sobe (marcado estimado) e nunca passa de 100%.
2. Depois do reset, o % parte de ~0 e cresce só com o gasto novo; semana também aparece (estimada se preciso).
3. Turno `limit` depois do último valor → 100% até o reset.
4. Sala de controle e Consumo mostram %, US$ e tokens por tipo para sprint, tarefa e agente; a soma dos tipos bate com o total.
5. Tela Consumo tem o acordeão "Por sprint".
6. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** `server/data.test.ts`: último valor velho + gasto novo → % maior, `estimated`; reset passado → % pelo gasto desde o reset, ≤100; turno `limit` → 100; semana estimada.
- **T02:** `server/data.test.ts`/`usage.test.ts`: soma por tipo igual ao total; tarefa pega o uso do seu agente; sem uso → campos ausentes.
- **T03/T04:** `Control.test.tsx`, `Usage.test.tsx`: textos de %, US$, tipos; acordeão por sprint abre e lista tarefas.
- **Manual (Daniel):** Sala de controle e Consumo com dados reais; perto do limite semanal, número acompanha.

## Tarefas

| Id  | Tarefa                                               | Agente         | Arquivos                                                                                                                             | Depende de | Bruta  | Planejado |
| --- | ---------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------ | --------- |
| T01 | Limite: estimativa desde o último valor e no reset   | clone (sonnet) | `server/data.ts`, `server/data.test.ts`, `src/lib/limits.ts`, `src/lib/limits.test.ts`, `src/data/types.ts`                          | —          | 60 min | 25 min    |
| T05 | ADR da calibração dos limites                        | clone (haiku)  | `docs/adr/0002-calibracao-limites.md`                                                                                                | —          | 15 min | 6 min     |
| T02 | Servidor: consumo por tipo em sprint, tarefa, agente | clone (sonnet) | `server/data.ts`, `server/data.test.ts`, `server/usage.ts`, `server/usage.test.ts`, `src/data/types.ts`, `src/data/mock.ts`          | T01        | 70 min | 28 min    |
| T03 | Sala de controle: %, US$ e tokens por tipo           | clone (sonnet) | `src/pages/Control.tsx`, `src/pages/Control.test.tsx`, `src/pages/Control.module.css`                                                | T02        | 50 min | 20 min    |
| T04 | Tela Consumo: tipos e acordeão por sprint            | clone (sonnet) | `src/pages/Usage.tsx`, `src/pages/Usage.test.tsx`, `src/lib/usage.ts`, `src/components/Layout.tsx`, `src/components/Layout.test.tsx` | T02        | 50 min | 20 min    |

**Ondas:** (1) T01, T05; (2) T02; (3) T03, T04

- **Onda 1:** T01 (`data.ts`, `limits.ts`, `types.ts`) e T05 (só um doc) não cruzam arquivos. É o conserto urgente: Daniel já pode ver o limite certo.
- **Onda 2:** T02 sozinha porque toca `data.ts`, `types.ts` e `mock.ts`, os mesmos de T01.
- **Onda 3:** T03 (Sala de controle) e T04 (Consumo e barra lateral) não cruzam arquivos. As duas chamam `frontend-design` antes do código (e `dataviz` para qualquer gráfico); entrega traz o plano visual.
- **Reviewer** (Sonnet) revisa ao fim de cada onda, com conferência visual nas telas na onda 3. Handoffs de T01/T02 listam os casos de erro (reset passado, sem leitura, sem uso).

**Referências da bruta:** T01 como a correção de dados da S11/T04 com mais casos; T02 como a S11/T02 (tokens por modelo); T03 e T04 como telas da S10/S11.

**Fator:** ~40% (S12 ficou em 115% nas tarefas de banco/gráfico com dado real; uso 40% e margem na T01/T02).

**Total estimado:** 99 min calibrado (245 min bruto). Relógio: ~60 min de agente em 3 ondas, mais revisões e o teste de Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-04 22:37:14 (horário de Brasília) — UTC 2026-11-05T01:37:14Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `f12b8a5080eae5337399fb8a938055fc7fe33a7c38035621544613151c2da693`
- **Versão do harness:** 0.14.0

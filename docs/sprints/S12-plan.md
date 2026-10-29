# S12 — Linha do tempo real, ondas certas e histórico guardado

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.10.1
- **Status:** aguardando aprovação

## Objetivo

O gráfico da Sala de controle mostra quando cada tarefa rodou de verdade, as tarefas extras do plano entram na onda certa e sai a barra "ctx", que não dizia nada. Do backlog: o histórico de chats sobrevive à troca de versão do banco.

## Diagnóstico (retorno de Daniel, 2026-10-28, 6thGear S03)

1. **Gráfico com horário errado:** o gráfico desenha o _previsto_ (início da sprint + posição no plano), não o executado; o real só aparece no tooltip. E o "início da sprint" virou 15:26 porque o plano foi reaprovado e o segundo `sprint.open` sobrescreveu o `started_at` (`server/events.ts`); a T01 rodou 09:15–09:22.
2. **Barra "ctx 91%":** vem do último `alert.context`, que o harness só manda perto do limite (≥120 mil tokens) e nunca atualiza depois da compactação. O número fica velho e alto. Decisão: tirar a barra.
3. **T08 e T09 sem onda:** o plano diz `(3b) T08 e T09`; o leitor só aceita `(N)` com número, então as duas ficam sem onda e caem num grupo sem cabeçalho nem cor.
4. **Histórico de chats (backlog):** quando a versão do banco sobe, `server/db.ts` apaga todas as tabelas e reimporta tudo; o que o Claude Code já apagou dos transcripts se perde.

## Escopo

1. **Gráfico com horário real (T01):**
   - Tarefa iniciada: barra do início real ao fim real (rodando: até agora). Tarefa a fazer: barra tracejada no previsto, empurrada para depois de agora se o previsto já passou.
   - Eixo do primeiro início real (ou do início da sprint) ao fim do previsto ou a agora, o que for maior. Pausas continuam na faixa própria.
   - Início da sprint = o **primeiro** `sprint.open` (reabertura não sobrescreve).
   - Tabela de tarefas: tarefa sem onda num grupo "Sem onda", com cabeçalho e cor neutra (nunca solta).
2. **Ondas com letra (T02):** o leitor do plano aceita `(3b)`; as ondas são numeradas pela ordem em que aparecem (no 6thGear S03: T08/T09 viram onda 4, T05 onda 5, T06/T07 onda 6).
3. **Sem barra "ctx" (T03):** sai a barra e o texto "ctx" dos agentes, e o campo `contextPct` dos dados.
4. **Histórico preservado (T04):** ao subir a versão do banco, as tabelas são recriadas e as linhas antigas copiadas de volta (colunas em comum); só tabelas que não existem mais são descartadas. Migração na mesma transação de hoje.

## Fora de escopo

- Link para abrir os documentos no VS Code (descartado por Daniel: ler no painel basta).
- Itens baixos do backlog: ações pelo painel, versão online e documentos estruturados para leitura na web.
- Medir o contexto real de cada agente (precisaria do tamanho da janela por modelo; pode voltar como pedido ao harness).
- Aumentar o `cleanupPeriodDays` do Claude Code (configuração da máquina de Daniel; o Tech Lead sugere na entrega).

## Critérios de aceite

1. No 6thGear S03, a T01 aparece no gráfico entre 09:15 e 09:22, e o "Início" da sprint é o da primeira abertura.
2. T08 e T09 aparecem numa onda com cabeçalho e cor; a sala mostra "onda N de 6".
3. Nenhum agente mostra barra ou texto "ctx".
4. Subir a versão do banco mantém as linhas de uso e de chats importadas antes (teste com transcript apagado).
5. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** `server/events.test.ts`: segundo `sprint.open` não muda `started_at`. `ui.test.tsx`: barra de tarefa feita na posição real; a fazer tracejada depois de agora; grupo "Sem onda".
- **T02:** `server/repo.test.ts` com `(1) T01; (2) T02; (3b) T03 e T04; (4) T05` → ondas 1, 2, 3, 4; formatos antigos seguem passando.
- **T03:** `Control.test.tsx`: sem "ctx" na tela.
- **T04:** `server/db.test.ts`: banco na versão anterior com linhas; abrir na versão nova mantém as linhas; tabela removida do esquema some.
- **Manual (Daniel):** Sala de controle do 6thGear S03.

## Tarefas

| Id  | Tarefa                                      | Agente         | Arquivos                                                                                                                           | Depende de | Bruta  | Planejado |
| --- | ------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Gráfico com horário real e grupo "Sem onda" | clone (sonnet) | `server/events.ts`, `server/events.test.ts`, `src/components/ui.tsx`, `src/components/ui.module.css`, `src/components/ui.test.tsx` | —          | 50 min | 20 min    |
| T02 | Ondas com letra no plano (`(3b)`)           | gemini         | `server/repo.ts`, `server/repo.test.ts`, `server/fixtures/repo/`                                                                   | —          | 20 min | 10 min    |
| T03 | Tirar a barra "ctx" dos agentes             | clone (sonnet) | `src/pages/Control.tsx`, `src/pages/Control.test.tsx`, `src/pages/Control.module.css`, `server/data.ts`, `src/data/types.ts`       | —          | 15 min | 5 min     |
| T04 | Banco: preservar linhas ao subir a versão   | clone (opus)   | `server/db.ts`, `server/db.test.ts`                                                                                                | —          | 40 min | 20 min    |

**Ondas:** onda 1 = T01, T02, T03, T04

- **Onda 1:** quatro agentes sem arquivo em comum (T01 `events.ts` e `ui.*`; T02 `repo.ts`; T03 Sala de controle, `data.ts`, `types.ts`; T04 `db.ts`). T01 e T03 chamam `frontend-design` antes do código (T01 também `dataviz`). T04 em Opus: mexe na migração do banco, onde erro apaga dados.
- **Reviewer** (Opus) revisa ao fim da onda, com conferência visual na Sala de controle do 6thGear.
- **Handoffs que citam eventos** apontam `docs/contracts/events.md` do harness (lição da S11).

**Referências da bruta:** T01 como S11/T02 (servidor + tela); T02 como S11/T01; T03 ajuste de tela pequeno; T04 como o ajuste de migração da S11 com mais cuidado.

**Fator:** ~40% (retrospectiva da S11: real em 32% do planejado com 60%).

**Total estimado:** 55 min calibrado (125 min bruto). Relógio: ~20 min de agente (uma onda) mais revisões e o teste de Daniel. T04 sobe a versão do banco: o painel fica alguns segundos fora na primeira subida; reiniciar `node server/main.ts` com um processo só.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-28 16:18:01 (horário de Brasília) — UTC 2026-10-28T19:18:01Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `d1b47975c74d40ca83a5e9c3b228fce4e811ee6785eb11282e3960dc830cf5c7`
- **Versão do harness:** 0.10.1

# S15 — Consumo por agente e participação nas tarefas

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.15.0
- **Status:** aguardando aprovação

## Objetivo

O consumo passa a ser mostrado **por agente**, onde ele pode ser medido. O card "Agentes" é refeito para mostrar, de cada agente, o consumo por tipo de token, o custo e as tarefas em que participou (com quantas vezes). A tabela de tarefas deixa de mostrar consumo e mostra só quem participou.

## Decisões de Daniel (2026-11-07)

- **Modelo 2** ("barra por agente"), escolhido entre 3 propostas (artefato https://claude.ai/artifact/7jui1oKHREzewrbT6RfT1u).
- **Tabela de tarefas:** sem somas, custo nem %. O consumo de uma tarefa não pode ser garantido (Tech Lead e Reviewer atravessam várias tarefas). Ficam só os ícones dos agentes que participaram.
- **Card Agentes:** os 4 tipos de token **em linha, um ao lado do outro**; o custo (Σ tokens, US$, % das 5 h, % da semana) **na linha de baixo**; as tarefas do agente com a **cor da onda** de cada uma.

## Escopo

1. **Dados (T01):** cada agente passa a trazer também o US$ de cada tipo de token (volume × preço do modelo, somado modelo a modelo; a soma dos 4 bate com o US$ total do agente). Cada tarefa passa a trazer quem participou e quantas passadas cada agente fez nela. Passada = um `task.start` do agente na tarefa (reabertura por reprovação ou ajuste conta de novo) ou, para o Reviewer, uma revisão (`review pass|fail`). Fonte: eventos já gravados; nenhum pedido ao harness.
2. **Card Agentes (T02):** por agente, em ordem:
   - linha 1: ícone, nome, estado;
   - linha 2: barra com a parte do gasto da sprint + %;
   - linha 3: entrada · saída · cache lido · cache escrito, lado a lado, cada um com a cor do seu tipo, volume com o custo ao lado em fonte menor (`9,1 mi (US$ 12,33)`; valor abaixo de US$ 0,01 mostra `<0,01`);
   - linha 4: Σ tokens · US$ · 5 h % · semana %;
   - linha 5: chips das tarefas (`T03 ×2`), cada um na cor da onda da tarefa.
     O que for sem dado continua aparecendo como "—"/"sem dado", nunca zero.
3. **Tabela de tarefas (T03):** a coluna "Consumo" sai (junto com `Kinds` e `costLine` dali). Entra a coluna "Participaram": só o ícone de cada agente (com `×N` quando N > 1 e o nome no `title`).

## Fora de escopo

- Consumo por tarefa, estimado por janela de tempo (descartado por Daniel; ver `docs/decisoes-daniel.md`).
- Tela "Consumo" (acordeão por sprint) e o painel Consumo da Sala de controle: não mudam.
- Projeto financeiro: continua com todos os eventos como `tech-lead` (um agente só); o card mostra o que existir, sem compensar.

## Critérios de aceite

1. A tabela de tarefas não mostra tokens, US$ nem %; mostra os ícones dos agentes que participaram, com `×N` quando houve mais de uma passada.
2. O card Agentes mostra, por agente, os 4 tipos de token numa linha e o custo na linha seguinte; agente sem leitura mostra "—", não zero.
3. Os chips de tarefa do card têm a cor da onda (a mesma da tabela); tarefa sem onda fica sem cor.
4. Um agente que fez duas passadas na mesma tarefa mostra `×2`.
5. Cada tipo de token mostra o volume e, ao lado, o US$ em fonte menor; a soma dos US$ por tipo é igual ao US$ total do agente.
6. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** `server/data.test.ts` com eventos de duas passadas do mesmo clone (reprovação) e de Reviewer com duas revisões; tarefa sem eventos de agente: lista vazia.
- **T02:** `src/pages/Control.test.tsx`: os 4 tipos na mesma linha, custo na linha seguinte, `×N`, cor da onda no chip, "—" sem leitura. Testes antigos do card atualizados.
- **T03:** teste da tabela: sem texto "Consumo"/US$/%; ícones e `×N`; o teste "task list: Consumo column" é reescrito.
- **Manual (Daniel):** conferir no painel real (dashboard-ia) o card e a tabela.

## Tarefas

| Id  | Tarefa                                         | Agente         | Arquivos                                                                                                                                                         | Depende de | Bruta  | Planejado |
| --- | ---------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Participação por agente nas tarefas (dados)    | clone (sonnet) | `server/data.ts`, `server/data.test.ts`, `src/data/types.ts`, `src/data/mock.ts`                                                                                 | —          | 40 min | 16 min    |
| T02 | Card Agentes: consumo em linha e chips de onda | clone (sonnet) | `src/pages/Control.tsx`, `src/pages/Control.test.tsx`, `src/components/Consumption.tsx`, `src/components/Consumption.module.css`, `src/components/ui.module.css` | T01        | 60 min | 24 min    |
| T03 | Tabela de tarefas: só os ícones dos agentes    | clone (sonnet) | `src/components/ui.tsx`, `src/components/ui.module.css`, `src/pages/Control.test.tsx`                                                                            | T02        | 30 min | 12 min    |

**Ondas:** (1) T01 → (2) T02 → (3) T03

- Sequencial de propósito: T02 e T03 mexem no mesmo teste (`Control.test.tsx`) e no mesmo CSS (`ui.module.css`); dois agentes nunca editam o mesmo arquivo ao mesmo tempo.
- T02 e T03 chamam `frontend-design` antes do código (T02 também `dataviz`, pela barra de parte do gasto) e trazem o plano visual na entrega.
- **Reviewer** (Sonnet) revisa ao fim de cada onda. Handoff de T01 lista os casos de erro (evento sem agente, agente sem id, tarefa sem eventos, `tech-lead` único no financeiro).

**Fator:** ~40%. **Total estimado:** 52 min calibrado (130 min bruto).

## Riscos

- A definição de "passada" depende de como os eventos reais registram reabertura de tarefa; T01 confere com os eventos gravados do dashboard-ia antes de fixar a regra e avisa se não bater.
- Barras de "parte do gasto" ficam dominadas pelo cache lido; por isso a barra usa o total de tokens do agente e os 4 tipos aparecem em números, não em segmentos.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-07 17:17:41 (horário de Brasília) — UTC 2026-11-07T20:17:41Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `4e77931e175a99058a3b9caa71770072f1619c42805e6e51f72bfd0a99b6e5ea`
- **Versão do harness:** 0.15.0

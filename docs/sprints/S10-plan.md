# S10 — Sala de controle por sprint e mais compacta

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.8.2
- **Status:** aguardando aprovação

## Objetivo

A Sala de controle passa a mostrar qualquer sprint escolhida no acordeão Projetos, ganha um contador até a renovação dos limites 5 h e semanal, e fica compacta: cards mais baixos, ~10 tarefas visíveis sem rolar, tarefas agrupadas por onda, barra de Andamento com o % da sprint e agentes que cabem no card.

## Escopo

1. **Ondas de volta (T01, servidor):** o leitor do plano (`server/repo.ts`) só entende `**Paralelismo:** onda 1 = T01, T02; ...` numa linha. A S09 escreveu em lista (`- **Onda 1:** T01 ...`) e as ondas sumiram. Passa a aceitar os dois formatos.
2. **Navegação por sprint (T02, menu):** com a tela Sala de controle aberta, clicar numa sprint do acordeão abre `/controle?p=<projeto>&s=<sprint>`. Nas outras telas, o clique continua abrindo a página da sprint. A sprint escolhida fica destacada no acordeão. Os limites no pé do menu passam a mostrar, nos dois (5 h e semanal), "renova em hh:mm" contando e a hora prevista; o texto sai de um helper novo (`src/lib/limits.ts`) que a T04 reaproveita.
3. **Base compacta (T03, componentes):**
   - **Legenda do Plano no tempo:** vira uma linha curta (bolinhas sem texto longo, detalhe no tooltip), sem esticar o card.
   - **Tabela de tarefas:** linhas mais baixas, para caber ~10 tarefas em 1920x1080 antes de rolar; cabeçalho de onda bem visível.
   - **Previsão de fim por tarefa:** nova coluna "Fim previsto" = início real + duração planejada (ou, se não começou, início da sprint + início e duração do plano). Tarefa feita mostra o fim real.
   - **Duração vira barra:** minutos corridos sobre os planejados, com o número (ex.: "12/30 min"); passou do planejado, a barra fica em alerta.
4. **Sala de controle (T04):**
   - Lê `?p=&s=`; sem parâmetro, segue a sprint principal do projeto (como hoje). O título mostra a sprint exibida.
   - **Limites:** faixa com 5 h e semanal: % usado, tempo até renovar (hh:mm, contando) e hora prevista da renovação. Limite em 100% fica em destaque. Sem `resetsAt`: "sem dado".
   - **Andamento:** a barra passa a ser o progresso da sprint, com o %. O "corrido sobre previsto" continua só como número.
   - **Agentes:** mostra quantos couberem na altura do card; a seta só aparece se sobrar agente.
5. **Revisão + conferência visual (T05, Reviewer):** lint, tipos, testes e o app no navegador em 1920x1080, escuro e claro: ~10 tarefas visíveis, cards da linha com a mesma altura, sem rolagem horizontal.

## Fora de escopo

- Mudar o menu lateral além do destaque, do link da sprint e do texto dos limites.
- Novos dados de limite: usa o `resetsAt` que já existe.
- Outras telas.

## Critérios de aceite

1. Na Sala de controle, clicar em qualquer sprint do acordeão mostra a sala daquela sprint; a URL pode ser copiada e reaberta.
2. Fora da Sala de controle, o clique na sprint continua abrindo a página da sprint.
3. As tarefas aparecem agrupadas por onda, inclusive na S09 (plano em lista) e nesta S10.
4. Faixa de limites mostra, para 5 h e semanal: %, "renova em hh:mm" contando e "às HH:MM" (ou dia + hora no semanal). O pé do menu mostra o mesmo tempo até renovar.
5. Barra do Andamento = % da sprint, com o número visível.
6. Legenda do Plano no tempo em uma linha; cards da primeira linha mais baixos que hoje e com a mesma altura.
7. Em 1920x1080, ~10 tarefas visíveis sem rolar a página.
   7a. Cada tarefa mostra o fim previsto, e a duração aparece como barra de minutos corridos sobre os planejados.
8. Agentes: sem seta quando todos cabem; com seta quando sobram.
9. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** `server/repo.test.ts` com os dois formatos (linha única e lista `- **Onda N:**`) e plano sem ondas.
- **T02:** `Layout.test.tsx`: em `/controle`, link da sprint aponta para `/controle?p=&s=`; em outra tela, para a página da sprint; pé do menu com "renova em" nos dois limites. `src/lib/limits.test.ts` para o helper (contagem, hora, sem dado).
- **T03:** teste da legenda (uma linha, itens só quando há pausa) e da tabela agrupada por onda; fim previsto (começada, não começada, feita) e barra de duração (dentro e acima do planejado).
- **T04:** `Control.test.tsx`: sprint pelo parâmetro, fallback sem parâmetro, faixa de limites (contagem e hora, 100% em destaque, sem dado), barra com %, seta de agentes só quando sobram.
- **T05:** conferência no navegador (1920x1080, escuro e claro), prints na revisão.
- **Manual (Daniel):** navegar entre sprints na Sala de controle e conferir a contagem dos limites.

## Tarefas

| Id  | Tarefa                                                              | Agente    | Arquivos                                                                                                                                         | Depende de        | Bruta  | Planejado |
| --- | ------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------ | --------- |
| T01 | Ondas: ler plano em linha e em lista                                | clone     | `server/repo.ts`, `server/repo.test.ts`, `server/fixtures/repo/`                                                                                 | —                 | 20 min | 10 min    |
| T02 | Menu: sprint abre a Sala de controle; renova em                     | clone     | `src/components/Layout.tsx`, `src/components/Layout.module.css`, `src/components/Layout.test.tsx`, `src/lib/limits.ts`, `src/lib/limits.test.ts` | —                 | 30 min | 15 min    |
| T03 | Base compacta: legenda do plano e tabela de tarefas                 | clone     | `src/components/ui.tsx`, `src/components/ui.module.css`, `src/components/ui.test.tsx`                                                            | —                 | 60 min | 30 min    |
| T04 | Sala de controle: sprint, limites, %, agentes                       | tech-lead | `src/pages/Control.tsx`, `src/pages/Control.test.tsx`, `src/components/ui.module.css`                                                            | T02, T03          | 60 min | 30 min    |
| T05 | Revisão das ondas + conferência visual no navegador                 | reviewer  | (só leitura)                                                                                                                                     | T01–T04, T06, T07 | 25 min | 13 min    |
| T06 | Só tema escuro: remover botão claro/escuro                          | clone     | `src/components/Layout.tsx`, `src/components/Layout.module.css`, `src/components/Layout.test.tsx`, `src/styles.css`, `index.html`                | T02               | 10 min | 5 min     |
| T07 | Progresso e ondas no 6thGear: fase "fila" e ondas em lista numerada | clone     | `server/events.ts`, `server/events.test.ts`, `server/repo.ts`, `server/repo.test.ts`, `server/fixtures/repo/`                                    | T01               | 20 min | 10 min    |

**Ondas:** onda 1 = T01, T02, T03; onda 2 = T04, T06, T07; onda 3 = T05

**Mudança pedida por Daniel (2026-10-23 00:06):** % sempre 0 e etapas que não acendem; ondas que não aparecem na Sala de controle do 6thGear. Causas: lá os clones só marcam as fases `fila` e `revisão`, e o painel ignora `fila` (T07: `fila` = teste, código e lint feitos); o plano do 6thGear lista as ondas numeradas (`1. T01, T02...`) sob `**Ondas:**` (T07: aceitar esse formato). Etapa a etapa (teste → código → lint) depende de os clones marcarem essas fases: pedido aberto no inbox do harness.

**Mudança pedida por Daniel (2026-10-22 23:54):** remover o botão de tema e manter só o escuro (T06); countdown dos limites acima de 24 h no formato `1D-hh:mm` (entra na T02/helper `limits.ts`). Conferência visual da T05 passa a ser só no escuro.

- **Onda 1:** três clones sem cruzamento: T01 só servidor; T02 só o menu; T03 só `ui.tsx`/`ui.module.css`. Contrato fixo entre T02 e T04: `/controle?p=<projectId>&s=<sprintId>`. T02 e T03 chamam `frontend-design` antes do código.
- **Onda 2:** T04 (Tech Lead), depois de T03, porque também mexe em `ui.module.css` (card de agentes e faixa de limites). Chama `frontend-design` e `dataviz` (barras).
- **Onda 3:** T05, Reviewer com **Sonnet** (nada toca superfície de segurança).

**Referências da bruta:** T01 como S09/T02 em escala menor; T02 e T03 como as telas da S09 (~30 min por tela, retrospectiva da S09); T04 como S09/T03 mais a faixa de limites; T05 como S09/T09.

**Fator:** 50%. Na S09 as telas levaram ~2x o planejado com 35%.

**Total estimado:** 98 min calibrado (195 min bruto). Relógio: ~73 min de agente (onda 1 ~30 min, onda 2 ~30 min, onda 3 ~13 min), mais o teste de Daniel. O servidor muda (T01): reiniciar `node server/main.ts` antes do teste.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-23 00:09:29 (horário de Brasília) — UTC 2026-10-23T03:09:29Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `65a312bafabb64b9d41d7357ebf4de463661b9ccbcc4ce1130c2cb985b5f0664`
- **Versão do harness:** 0.8.2

# S08 — Drafts do revamp do frontend

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.8.2
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe 3 direções completas para o novo frontend (visual, navegação, tela principal e componentes base), dentro do app e com os dados reais, para escolher uma (ou misturar). A S09 aplica a escolhida em todas as telas.

## Escopo

1. **Moldura dos drafts (Tech Lead):** página paralela `drafts.html` + `src/drafts/`, como na S06 (Ajuste 1), sem tocar no painel em produção. Seletor de direção (A/B/C) e de tela; mesmo `DataProvider` do painel (dados reais com o servidor ligado, mock sem ele). Cada direção exporta um componente `Draft` de `src/drafts/<a|b|c>/index.tsx`.
2. **3 direções (uma por clone), cada uma com:**
   - **Visual:** tokens próprios (cores, tipografia, espaçamento, raio), modo claro e escuro.
   - **Navegação e layout:** moldura nova (menu, troca de projeto, limites 5 h/semanal, aviso de sem conexão).
   - **Tela principal:** o máximo de informação de cada projeto numa olhada (sprint e tarefa atual, fase, % e gasto, chats abertos, alertas, ociosos), substituindo Bem-vindo + Ociosos.
   - **Componentes base:** folha de componentes (botão, selo de estado, cartão, tabela, acordeão, abas, medidor, estado vazio) e duas telas montadas com eles: **Sala de controle** e **Projeto › Sprints**.
   - **Direções de partida** (o clone refina com a skill `frontend-design`):
     - **A — Operação densa:** escuro primeiro, muita informação por tela, tipografia mono nos números (estilo painel de operação).
     - **B — Editorial limpo:** claro primeiro, bastante respiro, tipografia forte, hierarquia por tamanho e peso.
     - **C — Espaço de trabalho:** menu lateral com projetos sempre visíveis, conteúdo em painéis, meio-termo de densidade.
3. **Rodapé de cada direção:** 3–5 linhas com a ideia, o que muda na navegação e o que custa aplicar na S09.

## Fora de escopo

- Aplicar a direção nas telas reais (S09) e apagar os drafts (S09).
- Mudanças de servidor, dados ou eventos.
- Telas de projeto além de Sprints (Chats, Backlog, Documentos, Consumo seguem a direção escolhida na S09).

## Critérios de aceite

1. `drafts.html` abre no `npm run dev` com o seletor A/B/C e de tela; o painel em `/` segue igual.
2. Cada direção tem: tokens claro/escuro, moldura de navegação, tela principal, folha de componentes, Sala de controle e Projeto › Sprints.
3. A tela principal de cada direção mostra, por projeto: sprint e tarefa atual, fase, % e gasto, chats abertos, alertas e ociosos.
4. As 3 direções são visivelmente diferentes entre si (cores, tipografia e navegação).
5. Cada direção tem o rodapé com ideia, navegação e custo de aplicar.
6. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **T01:** teste de fumaça da moldura: renderiza, troca de direção e de tela.
- **T02–T04:** um teste de fumaça por direção: renderiza cada tela com o mock (inclui os campos do critério 3 na tela principal).
- **Manual (Daniel):** abre `drafts.html`, passa pelas 3 direções nos dois modos (claro/escuro) e escolhe.

## Tarefas

| Id  | Tarefa                                           | Agente    | Arquivos                                                                                                | Depende de | Bruta  | Planejado |
| --- | ------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------- | ---------- | ------ | --------- |
| T01 | Moldura dos drafts (seletor A/B/C e de tela)     | tech-lead | `drafts.html`, `src/drafts/main.tsx`, `src/drafts/Drafts.tsx`, `src/drafts/Drafts.test.tsx`, `index.md` | —          | 20 min | 7 min     |
| T02 | Direção A — Operação densa                       | clone     | `src/drafts/a/`                                                                                         | —          | 60 min | 20 min    |
| T03 | Direção B — Editorial limpo                      | clone     | `src/drafts/b/`                                                                                         | —          | 60 min | 20 min    |
| T04 | Direção C — Espaço de trabalho                   | clone     | `src/drafts/c/`                                                                                         | —          | 60 min | 20 min    |
| T05 | Revisão da onda (lint, tipos, testes, critérios) | reviewer  | (só leitura)                                                                                            | T01–T04    | 20 min | 7 min     |

**Paralelismo:** onda 1 = T01 (Tech Lead) e T02–T04 (clones), sem arquivos cruzados: cada clone só escreve na sua pasta e exporta `Draft` de `index.tsx` (contrato fixo no handoff). `src/components/`, `src/lib/`, `src/data/` e `src/styles.css` são só leitura; o clone copia o que precisar para a sua pasta. Cada clone chama a skill `frontend-design` (e `dataviz` para medidores e gantt) antes do código e entrega o plano visual. Onda 2 = T05 com Sonnet (não toca superfície de segurança).

**Referências da bruta:** T01 como a moldura da S06/T02; T02–T04 como S06/T02–T04 somadas (3 telas + folha de componentes + tokens); T05 como S07/T08.

**Fator:** 35% (a S07 ficou em ~40% do bruto nas telas; a retrospectiva sugeriu 35%).

**Total estimado:** 74 min calibrado (220 min bruto). Relógio: ~30 min de agente (onda 1 em paralelo ~20 min + revisão), mais a escolha de Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-22 11:05:58 (horário de Brasília) — UTC 2026-10-22T14:05:58Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `2f04dff3c71679b541afd8b137ce947acb2089735ba3528997f8e89dedec2014`
- **Versão do harness:** 0.8.2

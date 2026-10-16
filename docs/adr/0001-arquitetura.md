# ADR 0001 — Arquitetura do painel: eventos em arquivo, SQLite local e front React

- **Status:** aceito (combinado no plano aprovado da S01)
- **Data:** 2026-10-16
- **Harness:** 0.4.0

## Contexto

O Dashboard IA mostra projetos, chats, agentes (clones, Reviewer), sprints, tarefas e consumo (tokens, US$, % do limite). Os dados nascem no Main Harness e no Claude Code, em vários repos da máquina de Daniel. Precisamos definir agora o caminho dos dados, porque a S01 já cria as telas e os tipos que o resto vai usar.

A S01 entrega só o front, com dados de exemplo em `src/data/mock.ts`. Servidor, banco e importador ficam para as próximas sprints (ver `docs/backlog.md` e `docs/roadmap.md`) e dependem de dois pedidos no inbox do harness: ID fixo por projeto e eventos gravados em arquivo.

## O que a documentação diz

- `node:sqlite` (`DatabaseSync`) abre e consulta um banco sem instalar nada e sem flag no Node v24.15.0 desta máquina; SQLite 3.51.3 (teste local, 2026-10-16). Nível de estabilidade da API na documentação do Node: não verificado.
- Os eventos do harness ainda não existem; o formato previsto é JSONL por projeto em `~/.main-harness/events/*.jsonl` (`docs/backlog.md`, 2026-10-16).
- O Claude Code apaga transcripts antigos, então o histórico precisa ser guardado por nós (`docs/backlog.md`, 2026-10-16).

## Alternativas avaliadas

1. **Front lê os arquivos direto (sem servidor):** menos peças. Mas o navegador não lê `~/.main-harness` nem os transcripts sem permissão manual a cada vez, e não guarda histórico quando o Claude Code apaga os arquivos. Descartada.
2. **Banco externo (Postgres ou similar):** robusto e pronto para a versão online. Mas exige instalar e manter um serviço para um painel de um usuário só, rodando local. Descartada por agora; volta a ser avaliada na versão online.
3. **Biblioteca de gráficos (Recharts, Chart.js etc.):** gráficos prontos. Mas adiciona dependência e peso para poucos gráficos simples (barras e progresso de consumo). Descartada; usamos SVG simples e trocamos se os gráficos crescerem.
4. **Eventos em arquivo → importador → `node:sqlite` → servidor local → React (escolhida):** tudo local, sem instalar banco, histórico preservado, e o formato de evento é a única ligação com o harness.

## Decisão

1. O harness grava cada evento numa linha JSON, um arquivo por projeto (`~/.main-harness/events/<projeto>.jsonl`).
2. Um importador no servidor lê as linhas novas e grava no SQLite embutido do Node (`node:sqlite`), num arquivo local.
3. Um servidor Node (HTTP) expõe os dados ao front; o front atualiza a cada ~5 s.
4. O front é React com Vite e TypeScript; gráficos em SVG simples.
5. Na S01 o front usa `src/data/mock.ts`, já com os tipos do formato dos eventos: projeto com ID fixo; chat/sessão com agentes filhos (clones, Reviewer); sprint; tarefa com início, fim, duração e se está pronta; consumo em tokens, US$ e %. Ligar aos dados reais é trocar a origem, não as telas.

## Consequências

- Mais fácil: nada para instalar além do Node; tudo roda na máquina de Daniel; o histórico fica no SQLite mesmo após o Claude Code apagar transcripts.
- Mais difícil: o formato dos eventos vira contrato com o harness; mudança nele pede ajuste no importador.
- Risco aceito: depender de `node:sqlite` (API nova do Node). Versão online fica para depois e vai pedir outro armazenamento e login.
- Sinal para reverter: `node:sqlite` mudar a API ou falhar em atualizações do Node, ou o volume de eventos deixar o painel lento; aí reavaliamos um banco à parte.

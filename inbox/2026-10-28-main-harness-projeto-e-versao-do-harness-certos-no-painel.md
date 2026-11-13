# Pedido ao harness: Projeto e versão do harness certos no painel

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** media

## O que precisa

Casar transcript com projeto pelo maior prefixo de caminho (hoje compara o cwd exato) e mostrar a versão do harness de cada projeto (campo harness dos eventos), alertando quem ficou atrás do último harness.release.

## Por quê

Chats abertos em subpasta do projeto ficam fora do consumo, e não há visão central de versão.

## Exemplo

server/usage.ts:71 compara cwd exato

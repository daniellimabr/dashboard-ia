# Pedido ao harness: Painel Aguardando você

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Lista ao vivo dos chats parados esperando Daniel: desde quando e por quê (último turn.end ou attention sem prompt depois). Não encerrar por 30 min sem eventos o chat que só está esperando Daniel.

## Por quê

Hoje um chat esperando Daniel há mais de 30 min aparece como encerrado, e não há visão de quem precisa dele. O evento attention vem do harness (B107).

## Exemplo

server/data.ts:348-359 encerra o chat após 30 min sem eventos

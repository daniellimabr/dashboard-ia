# Pedido ao harness: Barra de contexto pelo evento context

- **Projeto:** main-harness
- **Data:** 2026-10-28
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Manter a barra ctx (rever S12/T03) e alimentá-la com o novo evento context, que o harness enviará a cada Stop (B108).

## Por quê

A barra mostrava valor velho porque vinha do alert.context, enviado só perto do limite. Com o evento a cada resposta, ela volta a ser útil.

## Exemplo

S12-plan.md T03 remove contextPct

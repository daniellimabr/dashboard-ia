# Decisões de Daniel — Dashboard IA

## 2026-11-07 — Consumo por agente, não por tarefa (S15, Modelo 2)

- **Decisão:** Modelo 2 ("barra por agente"). Tabela de tarefas sem soma, custo nem %: só os ícones dos agentes que participaram. Card Agentes: os 4 tipos de token em linha, lado a lado; custo na linha de baixo; tarefas com a cor da onda.
- **Porquê:** o consumo não é só daquela tarefa (Tech Lead e Reviewer atravessam várias), então não dá para garantir o número por tarefa.
- **Descartado:** Modelo 1 (selos) e Modelo 3 (matriz agente × tarefa).
- **Contraponto:** sem número na tabela, não se vê de relance qual tarefa custou mais; só o clone tem número por tarefa e isso poderia voltar como detalhe só para ele.

## 2026-11-07 — Card Agentes agrupa por papel (S15, retorno)

- **Decisão:** uma linha por papel (ex.: "Reviewer ×3") com tokens e custo somados, em vez de uma linha por agente aberto. Custo por tipo de token também no card Consumo. Clone ausente nos dados reais: pedido enviado ao harness (inbox).
- **Porquê:** o Tech Lead abre um agente novo por onda/tarefa; várias linhas iguais poluem o card.
- **Descartado:** manter uma linha por agente e reusar o Reviewer entre ondas.
- **Contraponto:** perde-se o detalhe por instância (qual clone/revisão custou mais).

## 2026-11-07 — Painel não se adapta a plano fora do padrão do harness

- **Decisão:** o painel lê só o formato de plano do harness (coluna `Id`, `Depende de`, `Planejado`, `**Ondas:**`/`**Paralelismo:**`). Plano de outro projeto fora do padrão é erro do projeto, corrigido lá.
- **Também:** clones têm agente próprio nos eventos; "tudo como tech-lead" não é o padrão do harness e não é compensado no painel.
- **Descartado:** tornar o leitor de plano tolerante e estimar consumo do Tech Lead pela janela (proposta do S14 inicial).
- **Contraponto:** o painel ficaria mudo diante de plano fora do padrão; um aviso explícito ("plano fora do padrão, 0 tarefas lidas") evita falha silenciosa.

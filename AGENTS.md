# AGENTS.md — Aurea Solaris

Leia este arquivo antes de alterar código, dados, documentação ou configuração.

## Autoridade e contexto

Em caso de conflito, a precedência é **segurança/privacidade → [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md) → este arquivo → [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) → guidance/referência local do domínio**. Planos antigos, evidências históricas e telas existentes não redefinem o produto atual.

Use o menor contexto necessário:

- estado factual atual: [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md);
- roteamento da tarefa: [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md);
- mudanças de feature/contrato: [`docs/NEW_FEATURE_GUIDE.md`](docs/NEW_FEATURE_GUIDE.md);
- detalhes adicionais: [`docs/index.md`](docs/index.md) e o `AGENTS.md` local do domínio, quando existir.

Não leia toda a árvore `docs/` por padrão.

## Regras inegociáveis

- **Privacidade e segredos:** nunca versione senha, chave de API, token, JWT, cookie, segredo de banco, credencial de provedor ou dado privado de pessoa. Não registre autorização nem corpos privados em logs.
- **Identidade e isolamento:** o proprietário de dados privados vem da autenticação validada pela API, nunca de um `owner_id` arbitrário enviado pelo cliente. Queries permanecem owner-scoped e RLS continua como defesa adicional.
- **Dados editoriais ≠ dados privados:** conhecimento astrológico editorial é impessoal e preserva proveniência/divergências; registros de pessoa nunca entram no corpus editorial.
- **Precisão astrológica:** cálculos certificados preservam UTC, fuso IANA, local, configuração, versão de motor/efeméride e hash de entrada. Sem fallback silencioso ou aproximação inventada. Mudança de comportamento exige testes de referência e relatório de diferenças.
- **Browser não é fronteira privilegiada:** credenciais confiáveis, segredos de servidor e lógica de certificação não são enviados ao frontend.
- **Runtime aposentado:** a Private Web V1 é o runtime de produto suportado. Não reintroduza arquitetura desktop/local nem Railway como execução/deploy ativo. Infraestrutura local descartável continua sendo apenas tooling de desenvolvimento/teste.
- **Dados históricos reais:** nunca inspecione, semeie, migre, apague ou altere bancos/backups/diretórios pessoais reais fora de um contrato explícito e separado de migração de dados.
- **Hermes e ações persistentes:** memória, tarefa, evento, interpretação permanente ou ação externa exigem o fluxo revisável definido pelo produto; não crie efeitos silenciosos.

## Forma de trabalhar

- Trate o repositório fonte como unidade de trabalho; use caminhos relativos e preserve mudanças existentes.
- Não use reset/checkout destrutivo nem force refs para trás; preserve refs e trabalho não relacionado já existente.
- Trabalhe no domínio proprietário da mudança. Guides locais existem em `apps/web/`, `services/api/` e `supabase/` para reduzir contexto.
- Faça mudanças pequenas e testáveis; não misture refatoração ou produto não relacionado.
- Prefira contrato/regressão primeiro quando o comportamento puder ser especificado antes da implementação.
- Atualize artefatos derivados (OpenAPI/tipos/schema/runbook) quando a fonte correspondente mudar.
- Rode gates proporcionais ao risco conforme [`docs/NEW_FEATURE_GUIDE.md`](docs/NEW_FEATURE_GUIDE.md); não enfraqueça fronteiras para fazer teste passar.
- Não use `npm audit fix --force` nem atualização de dependências em massa sem revisão específica.
- Antes de concluir, revise o diff completo, arquivos adicionados/removidos, referências de runtime, segredos, CI e pendências reais.
- Nunca invente conclusão de teste, fonte, cálculo, SHA, deployment ou estado de provedor.

## Repositório e operações

`vivicabsb-eng/AureaSolaris` é a fonte de verdade de desenvolvimento. `fernandodamaso/AureaSolaris-deploy` é somente o espelho de implantação por objeto Git exato já validado; não desenvolva nele nem trate diferença de SHA como drift automático.

Dentro de um issue/contrato já aprovado, operações rotineiras e reversíveis de engenharia — incluindo configuração prevista de provedor, promoção por SHA exato, deployment previsto, migration aprovada, review/fix de PR e merge limpo após verificação — são agent-autonomous.

Interrompa e peça decisão humana somente diante de ação destrutiva não aprovada, risco real a dados pessoais, necessidade de revelar/fornecer credencial, ambiguidade material de identidade/ambiente ou contradição factual entre o estado real e o contrato aprovado.

Para deploy/rollback, siga `docs/operations/`. Alias sozinho não prova provenance: relacione upstream SHA, mirror SHA autorizado, metadata do deployment, aliases e health.

## Handoff

Informe de forma breve:

- objetivo/contrato alterado;
- arquivos afetados;
- fronteira de risco tocada (ou `nenhuma`);
- validações executadas;
- SHA final e CI/deployment evidence quando aplicável;
- residual real/histórico mantido.

Evidência hospedada deve ser sanitizada: IDs, aliases, estados, contagens e SHAs são aceitáveis; valores secretos e dados privados não são.
# Constituição do Aurea Solaris

Este é o documento normativo-base para pessoas, IDEs e LLMs. Em caso de conflito, a precedência é **segurança/privacidade → esta Constituição → [`../AGENTS.md`](../AGENTS.md) → [`AI_WORKING_GUIDE.md`](AI_WORKING_GUIDE.md) → guidance/referência local do domínio**. Telas, planos antigos, snapshots factuais e registros históricos não redefinem estas decisões.

O estado factual/timestamped do produto e produção fica em [`CURRENT_STATE.md`](CURRENT_STATE.md); regras operacionais do repositório ficam em `AGENTS.md`; roteamento de tarefas fica no `AI_WORKING_GUIDE.md`. Esses documentos devem apontar para esta Constituição em vez de duplicar ou reinterpretar decisões normativas.

O roteiro de entregas está em [ROADMAP.md](ROADMAP.md). Ele organiza dependências, verticais e escopo planejado; não substitui o snapshot de runtime atual nem transforma item planejado em recurso já entregue.

## Missão

O Aurea Solaris é um ambiente privado para astrologia, estudo, organização pessoal e reflexão. Caderno espacial, caderno de estudo e outras visões podem representar os mesmos itens e relações sem transformar cada visão em um produto separado.

A experiência de aplicação ativa é a **Private Web V1**. O antigo produto desktop/local foi aposentado como caminho executável. Registros históricos continuam recuperáveis para auditoria e contexto, mas não definem como desenvolver, executar ou operar a aplicação atual.

## Escopo atual da Private Web V1

A Web V1 entrega hoje:

- autenticação da pessoa usuária;
- perfil e onboarding;
- perfil natal persistido;
- Mandala/dashboard;
- cálculos natais e de trânsitos pelo motor certificado;
- recibos persistidos dos cálculos, com dados necessários para reprodução e auditoria.

Recursos descritos em planos ou documentos históricos que não estejam nesse fluxo não se tornam parte da Web V1 apenas por existirem no repositório ou no histórico Git.

## Dois domínios, duas responsabilidades

1. **Conhecimento astrológico editorial**: conceitos, fontes, afirmações, tradições/escolas, cálculos documentados e relações. É impessoal, plural, rastreável e não pertence a um perfil individual.
2. **Espaço privado da pessoa**: perfil, dados de nascimento, recibos de cálculo e demais registros privados da aplicação. Cada registro privado é associado ao proprietário autenticado e não pode atravessar a fronteira de outra pessoa nem ser incorporado ao corpus editorial.

Uma afirmação editorial pode divergir de outra. O sistema preserva autor, tradição, fonte, trecho, revisão, incerteza e relação de concordância/contradição. Nunca elimina uma tradição apenas para simplificar a interface.

## Arquitetura e propriedade operacional da Web V1

A arquitetura ativa é web-first:

- `apps/web` contém a interface React/Vite;
- `services/api` contém a API FastAPI autenticada;
- **Vercel** hospeda os projetos web e API da Private Web V1;
- **Supabase** é responsável por Auth, Postgres e Row Level Security (RLS) da Web V1;
- o motor astrológico certificado e seus ativos de efemérides ficam sob a fronteira confiável da API;
- **Railway não faz parte da Web V1**.

O runtime desktop/local, empacotamento nativo e armazenamento SQLite do produto anterior não são caminhos ativos da aplicação. Eles não devem ser reintroduzidos por documentação, configuração, scripts ou código novo. Evidências históricas podem citar essas tecnologias quando estiverem claramente identificadas como histórico.

`tools/run_e2e.py` é infraestrutura local descartável de teste. Ele pode criar serviços e identidades sintéticas para validação isolada, mas não é um runtime local voltado à pessoa usuária e nunca autoriza acesso a dados pessoais reais ou bancos históricos.

## Repositórios e promoção

- **`vivicabsb-eng/AureaSolaris` é o repositório de desenvolvimento e a fonte de verdade do código.** Trabalho de produto, branches, PRs, CI e merges acontecem nele.
- **`fernandodamaso/AureaSolaris-deploy` é somente um espelho de implantação por SHA exato.** Ele não é um segundo repositório de desenvolvimento nem uma fonte alternativa de mudanças.
- Uma promoção deve preservar a identidade do objeto Git validado: o SHA promovido ao espelho precisa ser explicitamente verificado antes de qualquer implantação.
- Uma diferença entre o `main` upstream e o `main` do espelho pode ser intencional quando ainda não houve autorização de promoção. Não a trate automaticamente como drift.

A verificação de uma implantação segura relaciona quatro fatos independentes: SHA do upstream, SHA do espelho autorizado, SHA registrado no deployment Vercel e aliases/saúde dos projetos web e API. Um alias sozinho não prova qual código está servindo produção.

## Isolamento, identidade e RLS

A identidade do proprietário vem da autenticação Supabase validada pela API. O cliente não escolhe livremente um proprietário para uma operação privada.

- consultas e gravações de produto são explicitamente owner-scoped na API;
- as tabelas privadas mantêm `user_id` e políticas RLS que limitam leitura e escrita a `auth.uid() = user_id`;
- relações entre registros privados também preservam o proprietário, impedindo referências cruzadas entre contas;
- credenciais confiáveis do servidor nunca são entregues ao navegador;
- testes de isolamento devem provar o comportamento com pelo menos duas identidades sintéticas quando a fronteira de dados for alterada.

A expansão futura para mais pessoas preserva exatamente essas fronteiras. Escala de usuários não justifica remover owner scoping, enfraquecer RLS, compartilhar credenciais privilegiadas com o browser nem misturar dados privados ao conhecimento editorial.

## Precisão astrológica

Precisão e confiabilidade são inegociáveis. Todo cálculo preserva instante UTC, fuso IANA, local, zodíaco, ayanamsa quando aplicável, casas, orbes, pontos, versão de efemérides/motor e hash de entrada. Não há fallback silencioso que invente posições, nodos, retrogradação ou aspectos. Mudanças do motor exigem testes de referência, versionamento e relatório de diferença.

## Hermes

Hermes é tutor e parceiro de estudo: explica o raciocínio, distingue cálculo/fonte/inferência/opinião, corrige com respeito e cita as fontes. Ele consulta primeiro o conhecimento curado; pesquisa externa só dentro de fontes e consentimentos configurados. Memórias sobre o método da pessoa são propostas revisáveis e só se tornam persistentes após aprovação. Hermes nunca cria tarefas, eventos ou registros privados silenciosamente.

Hermes é uma identidade de produto independente do modelo de IA. Um provedor de IA pode ser escolhido ou trocado sem transferir silenciosamente senhas, tokens, histórico integral ou dados privados. O método, as memórias aprovadas, as anotações, as fontes e o conhecimento produzido pertencem ao Aurea e à pessoa, não ao agente usado em uma conversa.

## Enciclopédia e biblioteca pessoal

A **Enciclopédia Visual** é a Engenharia Astrológica incorporada ao Aurea Solaris: uma biblioteca de referência interna com fontes, tradições e relações visuais preservadas. Ela não substitui a vivência ou as anotações da pessoa.

O motor e a Enciclopédia obedecem a um contrato normativo explícito: a regra computável sempre identifica escola, variante, parâmetros e fonte; notas divergentes, curiosidades, etimologias, mitos e camadas não canônicas continuam estudáveis, mas não podem aparecer como default silencioso do cálculo.

Arquivos pessoais ou de saúde, quando existirem em escopos futuros, continuam privados e só podem ser processados após ação explícita. Astrologia médica é estudo/observação, nunca diagnóstico ou prescrição.

## Segredos, privacidade e recuperação

Senhas, tokens, JWTs, cookies, URLs de banco com credenciais, chaves privadas e segredos de provedor não ficam em Git, documentação, tickets, logs ou bundles do navegador. Valores sensíveis pertencem aos mecanismos seguros dos provedores e ambientes de execução.

Rollback de aplicação não é rollback destrutivo de dados. Em incidentes, prefira restaurar uma implantação web/API conhecida e compatível, rotacionar/revogar segredos quando necessário, desabilitar temporariamente a aplicação por controles do provedor e verificar novamente identidade, aliases e saúde. Nunca apague, reescreva ou restaure dados privados como efeito colateral de um rollback de código sem um contrato separado, explícito e seguro para dados.

## Autonomia de agentes

Dentro de um issue/contrato já aprovado, operações rotineiras e reversíveis de engenharia não devem voltar a depender de confirmações humanas artificiais. Isso inclui configuração rotineira de provedores, atualização controlada do espelho por SHA exato, deployments previstos pelo contrato, migrations aprovadas, ciclos de revisão/correção de PR e merge limpo após verificações finais.

Essa autonomia **não** elimina fronteiras de segurança. É obrigatório interromper e pedir decisão humana quando surgir ação destrutiva não aprovada, risco real a dados pessoais, necessidade de revelar ou fornecer uma credencial, ambiguidade material de identidade/ambiente, ou contradição entre o estado real dos provedores e o contrato aprovado.

## Regra para toda mudança

Antes de criar uma tela, recurso ou operação, declare o objeto que ela representa, sua fonte de verdade, proprietário, fronteira de acesso, como a pessoa revisa/desfaz/exporta e como Hermes explica origem e incerteza. Documentação, migrações, testes e evidência operacional fazem parte da entrega.
# AGENTS.md — Aurea Solaris

Este arquivo orienta pessoas, IDEs e agentes de IA. Leia-o antes de alterar código, dados, documentação ou configuração. Em caso de conflito, prevalecem segurança e privacidade; depois [`docs/CONSTITUICAO.md`](docs/CONSTITUICAO.md); depois este arquivo. Planos antigos e telas existentes não definem o produto.

Para a rota operacional compacta de agentes, leia [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) depois deste arquivo e consulte apenas o domínio necessário.

## Propósito e fronteiras

O **Aurea Solaris** é um aplicativo local-first para estudo astrológico, organização pessoal e reflexão. A realidade operacional atual é uma aplicação web local aberta no Chrome por um atalho executável; o Tauri e instaladores não são o foco atual, mas o código ainda existe para compatibilidade futura. O produto central é um **Caderno Vivo**: quadro visual espacial e caderno de notas são duas visões dos mesmos dados, não módulos duplicados.

A **Enciclopédia Visual** incorpora o acervo da Engenharia Astrológica como referência interna. Ela preserva fontes, escolas, divergências e versões; não simplifica apagando tradições. Finanças está fora do escopo atual.

O corpus não neutraliza crenças, correspondências ou interpretações para fazê-las parecer consenso. Aparência física, linguagem cármica, arquétipos, mitos, magia, medicina histórica e demais visões antigas ou atuais devem ser descritos como suas fontes realmente os apresentam, com autor, obra, escola/período, lógica interna, variantes e discordâncias. Contextualizar não significa apagar; e nenhuma fonte, citação ou genealogia pode ser inventada.

**Axioma editorial:** rigor significa atribuição e contexto, não higienização.

O primeiro alvo operacional agora é Chrome no Windows, confortável para notebook, iniciado por um atalho de clique único em `127.0.0.1`. A arquitetura deve preservar o modo local-first e continuar compatível com Tauri para uma etapa futura, sem bloquear a experiência no navegador.

## Duas bases de dados, dois limites

1. **Base editorial astrológica** — conteúdo impessoal: documentos brutos, fontes, citações, conceitos, claims, tradições, relações, versões e resultados de cálculo. Deve ter proveniência, hash e possibilidade de divergência.
2. **Base privada por pessoa** — perfis, mapas autorizados, diário, notas, tarefas, agenda, biblioteca pessoal, preferências, consentimentos e memória aprovada do Hermes. Todo registro privado tem `owner_id` e nunca é misturado à base editorial.

Não apague, sobrescreva ou “deduplique” conteúdo editorial sem preservar o original, a fonte e a decisão de revisão. Não migre nem registre segredos em dados de projeto.

## Regras inegociáveis

- **Precisão astrológica:** cálculos devem registrar UTC, fuso IANA, local, zodíaco, ayanamsa quando houver, sistema de casas, orbes, pontos, versão de efeméride/motor e hash de entrada. Sem valores inventados ou fallback silencioso. Alterações do motor exigem testes de referência e relatório de diferenças.
- **Privacidade:** nunca armazenar senha, chave de API, refresh token ou token de integração em `localStorage`, logs, prompts, `.env` versionado ou dados editoriais. Senhas usam Argon2id; segredos locais usam cofre criptografado/Stronghold por `secret_ref`; integrações futuras usam OAuth e consentimento explícito.
- **Saúde:** anexos e exames são privados e só são processados após ação explícita da pessoa. Astrologia médica é estudo e observação; jamais diagnóstico ou prescrição.
- **Ações revisáveis:** Hermes não cria memória, tarefa, evento, interpretação permanente ou ação externa silenciosamente. Toda sugestão nasce como proposta, informa fontes e incerteza, e pode ser aprovada, recusada, desfeita ou exportada.
- **Arquivos do usuário:** alterações destrutivas exigem escopo explícito, backup verificável e confirmação humana. Nunca apagar a Engenharia Astrológica durante a migração; primeiro criar snapshot, manifesto e validação de hashes/contagens.

## Hermes

Hermes é um tutor, assistente astrológico, secretário de organização e parceiro de estudo. Ele separa cálculo, fonte, inferência e opinião; ensina e corrige com respeito.

Hermes é independente do provedor de IA. ChatGPT pode ser o provedor inicial, mas cada conta pode escolher outro servidor/modelo autorizado. A mudança de provedor não transfere senha, token, histórico completo nem dados privados automaticamente. A memória e o método interpretativo pertencem à pessoa e ao Aurea, nunca ao provedor.

Pesquisa externa só ocorre dentro dos filtros de fontes configurados e com transparência sobre origem, data e limites. Primeiro consultar a enciclopédia e a biblioteca pessoal autorizada; depois, se necessário, pesquisa externa.

## Integrações e fonte de verdade

- Agenda, tarefas, trânsitos e reflexões seguem: `mapa → janela → intenção → plano → tarefa/evento → reflexão → aprendizado`.
- O banco privado do Aurea é a fonte de verdade. Google Calendar, Todoist e Drive são adaptadores opcionais, com sincronização idempotente, vínculo rastreável e resolução de conflito. Gmail não faz parte do escopo atual.
- Drive pode vincular pastas da biblioteca astrológica mediante autorização. Não copiar, indexar ou enviar arquivos sem escolha explícita.

## Forma de trabalhar no repositório

- Trate o repositório aberto como unidade de trabalho. Use caminhos relativos e não codifique `C:\AureaSolaris` ou dados pessoais no código/documentação.
- Antes de alterações amplas, examine o estado do Git e preserve mudanças existentes. Faça mudanças pequenas, testáveis e documentadas; não use reset/checkout destrutivo.
- Documentação, migração e teste são parte da entrega. Atualize a Constituição quando a decisão muda o produto; atualize docs técnicas quando muda a implementação.
- Prefira comandos não interativos e valide de forma proporcional: TypeScript, Rust, testes do motor, testes de migração e teste manual do instalador quando aplicável.
- Não use `npm audit fix --force` nem atualizações de dependência em massa sem revisão.
- Antes de concluir uma tarefa, confira `git status --short --branch`, `git diff` e os arquivos não rastreados. Todo arquivo intencionalmente alterado deve estar commitado; não declare a branch pronta enquanto houver mudança ou arquivo não rastreado não explicado.
- Faça commits pequenos e descritivos, confira o conteúdo staged antes do commit e repita a verificação do worktree depois dele. O handoff deve informar o hash do commit e qualquer pendência de push/merge.

## Mapa de código atual

| Área | Pontos de entrada |
| --- | --- |
| Composição React | `apps/web/src/app/AppProviders.tsx`, `apps/web/src/App.tsx` |
| Interface/componentes | `apps/web/src/components/` |
| Identidade, perfis e mapas | `apps/web/src/features/identity/` |
| Agenda, tarefas, eventos e calendário | `apps/web/src/features/agenda/` |
| Preferências/helpers de astrologia | `apps/web/src/features/astrology/` |
| Estado frontend de documentos de saúde | `apps/web/src/features/health/` |
| Workflows Hermes entre features | `apps/web/src/app/workflows/` |
| Compatibilidade legada de contexts | `apps/web/src/context/` — não adicionar novo estado de feature ao `AgendaContext` |
| Caderno/Mesa | `apps/web/src/components/MesaCriacao.tsx`, `apps/web/src/components/DiarioView.tsx` |
| Motor e API local | `astro_engine.py`, `main_api.py` |
| Desktop/Rust | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json` |
| Migrações de dados | `src-tauri/migrations/knowledge/`, `src-tauri/migrations/private/` |
| Constituição | `docs/CONSTITUICAO.md` |
| Domínios de dados | `docs/data/DOMINIOS_DE_DADOS.md` |

## Comandos usuais (Windows)

Execute a partir da raiz do projeto:

```powershell
npm run build
npm run test
npm run tauri -- build
cargo check --manifest-path .\src-tauri\Cargo.toml
```

O build do instalador requer o sidecar astrológico empacotado em `src-tauri/binaries/astro-engine-x86_64-pc-windows-msvc.exe`. Nunca dependa de uma instalação global de Python no computador da pessoa usuária.

### Sandbox de usuário de teste (agentes)

Para validar interface, runtime no Chrome ou fluxos ponta a ponta, **use o sandbox isolado** em vez dos dados reais da pessoa:

```powershell
.\launch_chrome.ps1 -TestUser
```

Para zerar e recriar a vida fictícia de teste:

```powershell
.\launch_chrome.ps1 -TestUser -Reset
```

Os dados reais ficam em `%LOCALAPPDATA%\Aurea Solaris\data` — **agentes não devem semear, apagar nem alterar esse diretório**. O sandbox de teste usa `%LOCALAPPDATA%\Aurea Solaris\test-user\data`, conta `aurea-test` (Pessoa Teste), porta **9878** e perfil Chrome separado. Detalhes: [`docs/AI_WORKING_GUIDE.md`](docs/AI_WORKING_GUIDE.md) e [`docs/data-persistence.md`](docs/data-persistence.md).

## Comunicação de agentes

Declara de forma breve: objetivo, arquivos afetados, risco para dados e como foi validado. A pessoa que organiza a criação deste projeto não tem conhecimento de desenvolvimento de software; portanto, explique decisões, riscos, erros e próximos passos em linguagem simples, defina termos técnicos quando forem necessários e forneça comandos prontos para copiar. Nunca presuma que ela consegue revisar código ou diagnosticar logs sozinha.

Peça autorização antes de ações externas, destrutivas ou que alterem contas/integrações. Não invente conclusão de teste, fonte ou cálculo. Ao concluir, registre pendências reais, informe o hash do commit, confirme se o worktree está limpo e entregue caminhos/artefatos verificáveis.
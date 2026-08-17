export const PLANET_MEANINGS: Record<string, string> = {
  Sun: "O Logos Solar, a Centelha Divina e o núcleo do Self consciente. No mapa, indica onde a vontade criativa se expressa e onde o indivíduo busca iluminar o mundo com sua essência autêntica, integrando o ego e o propósito vital.",
  Moon: "O Anima, a matriz da memória celular e a mente reativa. Representa o condicionamento emocional ancestral, a nutrição psíquica, as necessidades mais íntimas de segurança e os padrões kármicos trazidos do passado.",
  Mercury: "O Mensageiro Hermético, senhor do intelecto e das conexões. Governa os processos cognitivos, a capacidade de decodificação da realidade material, a articulação verbal e a agilidade nas trocas de informação e raciocínio lógico.",
  Venus: "O princípio de Atração e Coesão cósmica. Indica a estética refinada, os valores absolutos da alma, a capacidade de magnetizar relacionamentos harmônicos, e a busca pelo equilíbrio e simetria tanto nas artes quanto nas parcerias.",
  Mars: "A Força Motriz e a vontade direcionada. Simboliza o impulso guerreiro, a coragem para romper a inércia, o desejo primal, a assertividade na defesa das próprias fronteiras e a energia vital necessária para materializar intenções.",
  Jupiter: "O Grande Expansor e Mestre da Sabedoria. Reflete a busca por significado filosófico, a lei cósmica, a sorte divina (fortuna), a elevação moral, e a área da vida onde a fé se torna força magnética para a abundância.",
  Saturn: "O Senhor do Karma e Guardião do Limiar. Representa as estruturas de sustentação, o princípio da cristalização, os limites temporais (Chronos), as responsabilidades inevitáveis e as lições rigorosas que constroem a verdadeira maestria.",
  Uranus: "O Despertador Cósmico. Simboliza as rupturas de paradigma, os insights geniais e repentinos, a eletricidade, a rebelião contra a estagnação e o impulso para o futuro, exigindo a desconstrução de estruturas arcaicas.",
  Neptune: "A Dissolução das Fronteiras e a Consciência Oceânica. Indica o anseio pela transcendência espiritual, o acesso aos reinos arquetípicos invisíveis, a inspiração mística, a compaixão universal e também as armadilhas da ilusão.",
  Pluto: "O Mestre da Morte e Renascimento (Alquimia). Opera nas profundezas do inconsciente coletivo, revelando dinâmicas de poder ocultas, forçando catarses necessárias, eliminando o que está morto e permitindo a regeneração total da alma.",
  Chiron: "A Ferida Primordial e a Chave da Cura Cósmica. Um ponto de dor recurrente que, através da aceitação e transformação, torna-se o maior dom terapêutico que o indivíduo pode oferecer ao mundo, tornando-se o Curador Ferido.",
  NorthNode: "O Dharma Espiritual. A bússola da evolução da alma nesta encarnação; indica qualidades desconhecidas, desafiadoras e evolutivas que precisam ser desenvolvidas conscientemente para atingir o propósito de vida.",
  SouthNode: "O Karma Resíduo. A zona de conforto kármica construída em encarnações passadas; talentos inatos e padrões automáticos dos quais a alma deve se desprender para não cair na estagnação evolutiva.",
  Lilith: "A Sombra Feminina e a Força Telúrica. Indica a rebeldia absoluta, as pulsões reprimidas, a sexualidade selvagem e a recusa categórica em se submeter, onde o indivíduo clama por autonomia inegociável.",
  PartOfFortune: "O Lote Hermético da Alegria Material e Fluxo Espiritual. É o ponto exato onde a vontade do Sol, as necessidades da Lua e a identidade do Ascendente se alinham, gerando prosperidade e facilidade natural.",
  Vertex: "O Ponto do Destino ou 'Fatum'. Relaciona-se a encontros predestinados, intervenções cósmicas e eventos sincrônicos (especialmente em sinastria) que fogem ao livre arbítrio consciente, catalisando mudanças cruciais.",
  ASC: "O Veículo de Manifestação ou Persona. É o filtro através do qual a alma encara a vida, determinando a energia inicial aplicada em novos ciclos, a aparência física e a interface primária entre o indivíduo e o mundo.",
  MC: "O Zênite e o Destino Público. Simboliza a vocação mais alta, o legado que se deixa para a coletividade, a autoridade conquistada e a cristalização das ambições na esfera social e profissional."
};

export const PLANET_SIGN_KEYWORDS: Record<string, Record<string, string>> = {
  Sun: {
    Áries: "identidade pioneira, coragem e autoexpressão ativa",
    Touro: "determinação estável, foco em segurança e valores práticos",
    Gêmeos: "curiosidade intelectual, versatilidade e comunicação",
    Câncer: "essência acolhedora, sensibilidade e apego às origens",
    Leão: "brilho pessoal, expressão criativa e liderança natural",
    Virgem: "busca por aperfeiçoamento, análise e utilidade prática",
    Libra: "busca por harmonia, diplomacia e equilíbrio nas parcerias",
    Escorpião: "intensidade profunda, magnetismo e transformação",
    Sagitário: "otimismo expansivo, busca pela verdade e aventura",
    Capricórnio: "ambição estruturada, disciplina e responsabilidade",
    Aquário: "independência mental, originalidade e visão humanitária",
    Peixes: "empatia mística, inspiração artística e sensibilidade"
  },
  Moon: {
    Áries: "reações emocionais rápidas, coragem e independência",
    Touro: "segurança emocional baseada em estabilidade e conforto",
    Gêmeos: "necessidade de trocar ideias e intelectualizar emoções",
    Câncer: "alta sensibilidade, instinto de proteção e apego ao lar",
    Leão: "necessidade de valorização, orgulho e calor emocional",
    Virgem: "cuidado prático, prestatividade e análise das emoções",
    Libra: "diplomacia, busca por consenso e equilíbrio nas emoções",
    Escorpião: "emoções intensas, profundas, investigativas e magnéticas",
    Sagitário: "busca por liberdade emocional, otimismo e humor",
    Capricórnio: "reserva emocional, maturidade precoce e contenção",
    Aquário: "independência afetiva, amor à liberdade e amizade",
    Peixes: "absorção psíquica, empatia profunda e imaginação emocional"
  },
  Mercury: {
    Áries: "pensamento rápido, direto e comunicação assertiva",
    Touro: "raciocínio focado no prático, persistência e pé no chão",
    Gêmeos: "agilidade mental brilhante, curiosidade e eloquência",
    Câncer: "pensamento intuitivo guiado pela memória emocional",
    Leão: "comunicação dramática, confiante e expressão criativa",
    Virgem: "lógica analítica impecável, detalhismo e precisão",
    Libra: "pensamento diplomático, ponderação e busca de acordo",
    Escorpião: "mente investigativa, penetrante, perspicaz e direta",
    Sagitário: "comunicação livre, busca por verdades e mente aberta",
    Capricórnio: "raciocínio pragmático, sério, estruturado e realista",
    Aquário: "ideias originais, mente científica e foco coletivo",
    Peixes: "pensamento intuitivo, imaginação poética e sensibilidade"
  },
  Venus: {
    Áries: "amor impulsivo, conquistador, assertivo e apaixonado",
    Touro: "afeto sensorial, leal, apreciador da beleza e do conforto",
    Gêmeos: "atração pela inteligência, leveza e flertes mentais",
    Câncer: "amor acolhedor, familiar, protetor e carente de afeto",
    Leão: "amor generoso, exuberante, leal e orgulhoso",
    Virgem: "afeto prático demonstrado através de atos de serviço",
    Libra: "harmonia romântica, equilíbrio, justiça e busca estética",
    Escorpião: "paixão profunda, magnética, possessiva e regeneradora",
    Sagitário: "amor aventureiro, alegre, expansivo e amante do espaço",
    Capricórnio: "compromisso sério, fidelidade estruturada e maturidade",
    Aquário: "parcerias livres de convenções, amizade e autonomia",
    Peixes: "amor incondicional, romântico, devocional e empático"
  },
  Mars: {
    Áries: "ação rápida, coragem agressiva e liderança pioneira",
    Touro: "determinação paciente, persistência física e teimosia",
    Gêmeos: "energia canalizada na comunicação, debates e mente ágil",
    Câncer: "ação protetora orientada pela defesa da família e sentimentos",
    Leão: "força criativa, orgulho, liderança ativa e nobreza",
    Virgem: "ação focada em eficiência, método, trabalho e detalhes",
    Libra: "energia voltada para a justiça, mediação e cooperação",
    Escorpião: "força estratégica oculta, magnetismo de combate e foco",
    Sagitário: "ação entusiasmada, motivada por ideais elevados e ética",
    Capricórnio: "energia canalizada de forma ambiciosa, planejada e fria",
    Aquário: "ação independente, rebelde, visionária e coletiva",
    Peixes: "ação intuitiva guiada por idealismo espiritual e fluidez"
  }
};

export function getPlanetSignKeyword(planet: string, sign: string): string {
  const planetKeywords = PLANET_SIGN_KEYWORDS[planet];
  if (planetKeywords && planetKeywords[sign]) {
    return planetKeywords[sign];
  }

  // Dynamic fallback generator
  const pBase = {
    Sun: "expressão da essência",
    Moon: "reação emocional",
    Mercury: "comunicação",
    Venus: "busca por harmonia",
    Mars: "impulso de ação",
    Jupiter: "expansão",
    Saturn: "disciplina e limites",
    Uranus: "independência",
    Neptune: "inspiração",
    Pluto: "regeneração profunda",
    Chiron: "cura da vulnerabilidade",
    NorthNode: "evolução espiritual",
    SouthNode: "talento confortável",
    Lilith: "autonomia rebelde",
    PartOfFortune: "fluxo próspero",
    Vertex: "encontro marcante",
    ASC: "persona externa",
    MC: "reputação profissional",
  }[planet] || "vibração energética";

  const sBase = {
    Áries: "ativa e pioneira",
    Touro: "estável e sensorial",
    Gêmeos: "mental e versátil",
    Câncer: "acolhedora e intuitiva",
    Leão: "expressiva e radiante",
    Virgem: "analítica e refinada",
    Libra: "diplomática e equilibrada",
    Escorpião: "intensa e transformadora",
    Sagitário: "otimista e aventureira",
    Capricórnio: "focada e disciplinada",
    Aquário: "original e independente",
    Peixes: "empática e sonhadora",
  }[sign] || "alinhada ao signo";

  return `${pBase} ${sBase}`;
}

export function getAspectKeyword(type: string, p1: string, p2: string): string {
  const p1Pt = p1.toLowerCase();
  const p2Pt = p2.toLowerCase();

  // Specific famous configurations
  if (type === 'Conjunção' && ((p1 === 'Sol' && p2 === 'Mercúrio') || (p1 === 'Mercúrio' && p2 === 'Sol'))) {
    return "comunicação e pensamento favorecidos";
  }
  if (type === 'Conjunção' && ((p1 === 'Sol' && p2 === 'Lua') || (p1 === 'Lua' && p2 === 'Sol'))) {
    return "alinhamento harmônico de propósito e sentimentos";
  }
  if (type === 'Quadratura' && ((p1 === 'Saturno' && p2 === 'Vênus') || (p1 === 'Vênus' && p2 === 'Saturno'))) {
    return "testes de maturidade no afeto e finanças";
  }
  if (type === 'Trígono' && ((p1 === 'Júpiter' && p2 === 'Sol') || (p1 === 'Sol' && p2 === 'Júpiter'))) {
    return "expansão pessoal, otimismo e proteção";
  }

  // General templates
  const template = {
    Conjunção: `fusão de energias de ${p1Pt} e ${p2Pt}`,
    Oposição: `polarização e busca de equilíbrio entre ${p1Pt} e ${p2Pt}`,
    Trígono: `fluxo fluído e facilidade natural entre ${p1Pt} e ${p2Pt}`,
    Quadratura: `tensão construtiva e impulso entre ${p1Pt} e ${p2Pt}`,
    Sextil: `oportunidade criativa e estímulo mútuo entre ${p1Pt} e ${p2Pt}`,
    Quincúncio: `necessidade de ajuste constante entre ${p1Pt} e ${p2Pt}`,
  }[type] || `relação geométrica entre ${p1Pt} e ${p2Pt}`;

  return template;
}

export const ASPECT_MEANINGS: Record<string, string> = {
  Conjunção: "Fusão Alquímica (0°): As energias de ambos os planetas se mesclam em um único núcleo de poder indissolúvel. Pode gerar talentos brilhantes, mas também pontos cegos por falta de perspectiva externa.",
  Oposição: "Tensão e Integração (180°): Cria um eixo magnético de confronto ou espelhamento. É uma dinâmica relacional constante; projeta-se o problema no outro, exigindo maturação para unir esses opostos na psique.",
  Trígono: "Fluxo e Graça (120°): Sinergia harmônica e irrestrita no mesmo elemento. Indica talentos inatos e proteção celestial que fluem sem effort, podendo também gerar acomodação pela falta de atrito kármico.",
  Quadratura: "Fricção e Construção (90°): Conflito entre naturezas cruzadas que exige ação. É o aspecto que mais gera movimento e sucesso prático na vida, pois a tensão interna obriga a alma a buscar resoluções e superar limites.",
  Sextil: "Potencial Criativo (60°): Uma oportunidade cósmica de colaboração fluida entre elementos compatíveis. Não é automática como o trígono; exige a intenção e a vontade do indivíduo para ser manifestada e ativada.",
  Quincúncio: "Ajuste Kármico (150°): Desconexão fundamental (Aversão) que exige adaptação incessante. Os planetas não compartilham modalidade nem polaridade, forçando refinamentos contínuos e paradoxos psicológicos a serem resolvidos."
};

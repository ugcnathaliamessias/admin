// =====================================================================
// viagem.js: Instagram › Vai Ter Estrada › 🇵🇾 Viagem Paraguai
// Projeto separado das abordagens normais: marcas e serviços de Foz do
// Iguaçu, Paraguai e Argentina pra viagem de 13 a 17/12/2026.
//   - Contagem e cronograma (1ª mensagem, follow-up, fechar, gravar)
//   - Marcas por tipo, com prioridade, proposta e status
//   - Mensagens prontas (copiar já preenchido) e "Enviei"
// As marcas ficam em abord_contatos (perfil vaiterestrada) com a 1ª linha
// das notas começando por "🇵🇾 Viagem Foz/Paraguai": prioridade, proposta
// e o nº da mensagem saem dali. Elas NÃO aparecem na Lista do dia normal;
// depois do "Enviei" entram no Controle e os follow-ups vão pro Quadro.
// =====================================================================
window.Viagem = (() => {
  const { esc, toast } = App;

  const MARCA = /Viagem Foz\/Paraguai/;
  const ehDaViagem = (c) => MARCA.test(String(c?.notas || "").split("\n")[0]);

  const IDA = "2026-12-13";
  const VOLTA = "2026-12-17";
  // Até 02/12 ainda entram marcas novas; até 04/12 tem follow-up; a partir de 05/12 só
  // fechar por escrito. As etapas ganham ✓ sozinhas pelo que já foi feito (ou quando
  // a data passa); as que o painel não tem como saber, a Nath marca com um toque.
  const FIM_ABORDAGEM = "2026-12-02";
  const FIM_FOLLOWUP = "2026-12-04";
  const INICIO_FECHAR = "2026-12-05";
  const ABERTAS = ["time", "conversando", "proposta"];
  const ETAPAS = [
    { id: "a", ate: FIM_ABORDAGEM, t: "1ª mensagem pras prioridade A",
      feito: (v) => !v.some((c) => c.status === "a_enviar" && info(c).pri === "A") },
    { id: "b", ate: FIM_ABORDAGEM, t: "1ª mensagem pras prioridade B (e marcas novas que entrarem)",
      feito: (v, h) => h > FIM_ABORDAGEM || !v.some((c) => c.status === "a_enviar" && info(c).pri !== "A") },
    { id: "fu", ate: FIM_FOLLOWUP, t: "Follow-ups (3 e 5 dias depois da mensagem)",
      feito: (v, h) => h > FIM_FOLLOWUP || !v.some((c) => c.status === "a_enviar" || c.status === "enviado" || (c.status === "time" && (c.followups || 0) < 2)) },
    { id: "fechar", de: INICIO_FECHAR, ate: "2026-12-12", t: "Fechar tudo por escrito (entregas, datas, contratos, o que recebe)",
      feito: (v, h) => h > "2026-12-12" || (h >= INICIO_FECHAR && !v.some((c) => ABERTAS.includes(c.status))) },
    { id: "passagens", ate: "2026-12-12", t: "Comprar passagens e montar a agenda de gravação", manual: true },
    { id: "gravar", ate: VOLTA, t: "Gravar em Foz, no Paraguai e na Argentina", manual: true },
    { id: "entregar", ate: "2026-12-31", t: "Entregar e postar", manual: true },
  ];
  // marcas manuais ficam numa linha própria da tabela analises (privada)
  const PERFIL_CHECKS = "viagem-paraguai";
  let checks = { id: null, feitos: {} };

  const TIPOS = [
    { n: "1", t: "📱 Lojas no Paraguai" },
    { n: "2", t: "🏨 Hotéis e resorts" },
    { n: "3", t: "🏕️ Camping, hostel e Airbnb" },
    { n: "4", t: "🎢 Passeios e atrações" },
    { n: "7", t: "🧭 Turismo oficial e apps de viagem" },
    { n: "5", t: "🍽️ Onde comer" },
    { n: "6", t: "🚐 Transfer, agências e câmbio" },
  ];

  // mensagem 8 (casa ou Airbnb, abordada pelo Instagram) fica no grupo do camping
  // mensagem 9 (app ou plataforma de viagem) fica no grupo do turismo
  const grupoDe = (n) => (n === "8" ? "3" : n === "9" ? "7" : n);

  const STATUS = [
    { v: "a_enviar", t: "A contatar" },
    { v: "enviado", t: "Mensagem enviada" },
    { v: "time", t: "Direcionada pro time" },
    { v: "conversando", t: "Respondeu / conversando" },
    { v: "proposta", t: "Proposta enviada" },
    { v: "fechou", t: "Parceria fechada 🎉" },
    { v: "recusou", t: "Sem interesse" },
    { v: "pausada", t: "Pausada" },
    { v: "sem_retorno", t: "Encerrada" },
  ];
  const RESPONDEU = ["time", "conversando", "proposta"];

  const ABRE = "Oi, {saudação}! Tudo bem? Aqui é a Nath, do Vai Ter Estrada 🏕️";
  const KIT = "Nosso mídia kit, com vídeos e números atualizados: https://vaiterestrada.github.io/midiakit/";
  const MENSAGENS = {
    1: { t: "Loja", texto: `${ABRE}

Eu e o João criamos conteúdo sobre viagens, camping e experiências de verdade. Entre 13 e 17 de dezembro a gente vai pra Foz e pro Paraguai com uma missão: trocar de celular (iPhone Pro Max) e, se der, levar MacBook e drone pros nossos conteúdos.

A ideia é mostrar essa compra de verdade, do começo ao fim: a loja, o atendimento, o preço, a garantia e o unboxing. E a gente queria que isso acontecesse aí na {marca}.

Nos últimos 30 dias alcançamos {alcance} contas, com um público que planeja e viaja de verdade. ${KIT}

Com quem a gente fala sobre conteúdo e influência?` },
    2: { t: "Hotel ou resort", texto: `${ABRE}

Eu e o João criamos conteúdo sobre viagens, camping e hospedagens. Entre 13 e 17 de dezembro a gente vai estar em Foz e no Paraguai, montando uma série: "da barraca ao all inclusive em Foz".

A gente adoraria contar a história do {marca}: a chegada, a estrutura, o que está incluso e os detalhes que fazem valer a viagem, bem no comecinho das férias de dezembro.

Nos últimos 30 dias alcançamos {alcance} contas, público de {público}. ${KIT}

Com quem a gente fala sobre conteúdo e influência? Pode ser e-mail ou WhatsApp 😊` },
    3: { t: "Camping ou hostel", texto: `${ABRE}

A gente cria conteúdo de camping e estrada, e entre 13 e 17 de dezembro vai estar em Foz do Iguaçu. Uma das perguntas que mais aparecem pra gente é "onde acampar perto das Cataratas?", e o {marca} é um dos lugares que mais aparecem nas buscas.

Queria saber se a gente pode passar aí pra gravar a estrutura e mostrar como funciona, do jeito que a gente faz nos nossos vídeos: a chegada, as áreas, o que tem pra quem vem de barraca ou motorhome. O conteúdo fica com vocês também.

${KIT}

Com quem a gente fala sobre isso?` },
    4: { t: "Passeio ou atração", texto: `${ABRE}

Eu e o João vamos estar em Foz entre 13 e 17 de dezembro, gravando uma série sobre a região, e o {marca} está no nosso roteiro. A gente queria mostrar a experiência de verdade, do jeito que a gente faz nos nossos vídeos: a chegada, o passeio e o que faz valer a visita.

Nos últimos 30 dias alcançamos {alcance} contas. ${KIT}

Vocês têm alguma ação com criadores de conteúdo? Com quem a gente fala?` },
    5: { t: "Restaurante", texto: `${ABRE}

Eu e o João vamos estar em Foz entre 13 e 17 de dezembro gravando uma série sobre a viagem, e o {marca} é parada obrigatória na nossa lista. A gente queria mostrar a experiência completa, do ambiente ao prato.

${KIT}

Vocês topam uma parceria em troca de conteúdo? Com quem a gente fala? 😊` },
    6: { t: "Transfer ou agência", texto: `${ABRE}

Entre 13 e 17 de dezembro eu e o João vamos pra Foz e pro Paraguai, e uma dúvida que todo mundo tem é "como se locomover entre Foz, o Paraguai e as atrações?". A gente queria responder isso mostrando o serviço da {marca} na prática.

Nos últimos 30 dias alcançamos {alcance} contas. ${KIT}

Com quem a gente fala sobre conteúdo e influência?` },
    7: { t: "Visit Iguassu", texto: `Olá, equipe Visit Iguassu! Tudo bem? Aqui é a Nath, do Vai Ter Estrada 🏕️

Eu e o João criamos conteúdo sobre viagens, camping e hospedagens, com um público adulto que planeja e viaja de verdade, principalmente da Grande SP. Entre 13 e 17 de dezembro vamos estar em Foz gravando uma série sobre a região: "da barraca ao all inclusive em Foz", com compras no Paraguai e o lado argentino.

Vimos o projeto Influencers Experience e adoraríamos participar, com apoio de hospedagem e atrações associadas. ${KIT}

Podemos mandar uma proposta com o roteiro?` },
    8: { t: "Casa ou Airbnb (pelo Instagram)", texto: `${ABRE}

Eu e o João criamos conteúdo sobre viagens, camping e hospedagens, e entre 13 e 17 de dezembro a gente vai estar em Foz do Iguaçu. Encontramos a {marca} e amamos o espaço!

A gente adoraria se hospedar aí e mostrar a casa do jeito que a gente faz nos nossos vídeos: a chegada, os cantinhos, a estrutura e o que faz a estadia valer a pena. Pensamos numa parceria: um desconto ou algumas diárias em troca de um vídeo mostrando a casa, e o conteúdo fica com vocês também.

${KIT}

Topam conversar sobre isso? 😊` },
    9: { t: "App ou plataforma de viagem", texto: `${ABRE}

Eu e o João criamos conteúdo sobre viagens, camping e experiências de verdade, pra um público brasileiro que planeja e viaja de verdade. Entre 13 e 17 de dezembro a gente vai pra Foz do Iguaçu, Paraguai e o lado argentino, e queria planejar e reservar os passeios da viagem pela {marca}.

A ideia é mostrar na prática como funciona: montar o roteiro, escolher e reservar os passeios (Cataratas, Macuco, Itaipu...) e contar se valeu a pena no dia. Um conteúdo que responde a dúvida de quem está planejando as férias de dezembro.

Nos últimos 30 dias alcançamos {alcance} contas. ${KIT}

Vocês têm um programa com criadores de conteúdo? Com quem a gente fala?` },
    f: { t: "Follow-up", texto: `Oi, {saudação}! Passando aqui de novo 😊 A nossa viagem pra Foz está chegando (13 a 17/12) e estamos fechando o roteiro de gravações essa semana. Ainda dá tempo de incluir o {marca}. Com quem a gente pode falar?` },
  };

  // ---------- espanhol (marcas do Paraguai e da Argentina) ----------
  const ABRE_ES = "¡Hola, {saudação}! ¿Cómo están? Soy Nath, de Vai Ter Estrada 🏕️";
  const KIT_ES = "Nuestro media kit, con videos y números actualizados: https://vaiterestrada.github.io/midiakit/";
  const MENSAGENS_ES = {
    1: `${ABRE_ES}

João y yo creamos contenido sobre viajes, camping y experiencias reales para un público brasileño. Entre el 13 y el 17 de diciembre vamos a Foz y a Paraguay con una misión: cambiar de celular (iPhone Pro Max) y, si se puede, llevar una MacBook y un drone para nuestros contenidos.

La idea es mostrar esa compra de verdad, de principio a fin: la tienda, la atención, el precio, la garantía y el unboxing. Y nos gustaría que eso pasara en {marca}.

En los últimos 30 días llegamos a {alcance} cuentas, con un público que planea y viaja de verdad. ${KIT_ES}

¿Con quién podemos hablar sobre contenido e influencia?`,
    2: `${ABRE_ES}

João y yo creamos contenido sobre viajes, camping y hospedajes para un público brasileño. Entre el 13 y el 17 de diciembre vamos a estar en Foz y en Paraguay, armando una serie: "de la carpa al all inclusive en Foz".

Nos encantaría contar la historia de {marca}: la llegada, la estructura, lo que está incluido y los detalles que hacen que el viaje valga la pena, justo al comienzo de las vacaciones de verano.

En los últimos 30 días llegamos a {alcance} cuentas, público de {público}. ${KIT_ES}

¿Con quién podemos hablar sobre contenido e influencia? Puede ser por e-mail o WhatsApp 😊`,
    3: `${ABRE_ES}

Creamos contenido de camping y viajes por carretera para un público brasileño, y entre el 13 y el 17 de diciembre vamos a estar en la región de las Cataratas. Una de las preguntas que más nos hacen es "¿dónde acampar cerca de las Cataratas?", y {marca} es uno de los lugares que más aparecen en las búsquedas.

Queríamos saber si podemos pasar a grabar la estructura y mostrar cómo funciona, como hacemos en nuestros videos: la llegada, los espacios, lo que hay para quien viene en carpa o motorhome. El contenido queda también para ustedes.

${KIT_ES}

¿Con quién podemos hablar sobre esto?`,
    4: `${ABRE_ES}

João y yo vamos a estar en Foz entre el 13 y el 17 de diciembre, grabando una serie sobre la región para un público brasileño, y {marca} está en nuestro itinerario. Queremos mostrar la experiencia de verdad, como hacemos en nuestros videos: la llegada, el paseo y lo que hace que la visita valga la pena.

En los últimos 30 días llegamos a {alcance} cuentas. ${KIT_ES}

¿Tienen alguna acción con creadores de contenido? ¿Con quién podemos hablar?`,
    5: `${ABRE_ES}

João y yo vamos a estar en la región de Foz entre el 13 y el 17 de diciembre, grabando una serie sobre el viaje, y {marca} es parada obligada en nuestra lista. Queremos mostrar la experiencia completa, del ambiente al plato.

${KIT_ES}

¿Les interesa una alianza a cambio de contenido? ¿Con quién podemos hablar? 😊`,
    6: `${ABRE_ES}

Entre el 13 y el 17 de diciembre João y yo vamos a Foz y a Paraguay, y una duda que todo el mundo tiene es "¿cómo moverse entre Foz, Paraguay y las atracciones?". Queremos responder eso mostrando el servicio de {marca} en la práctica.

En los últimos 30 días llegamos a {alcance} cuentas. ${KIT_ES}

¿Con quién podemos hablar sobre contenido e influencia?`,
    7: `¡Hola, equipo de Visit Iguassu! ¿Cómo están? Soy Nath, de Vai Ter Estrada 🏕️

João y yo creamos contenido sobre viajes, camping y hospedajes, con un público brasileño adulto que planea y viaja de verdad, principalmente de São Paulo. Entre el 13 y el 17 de diciembre vamos a estar en Foz grabando una serie sobre la región: "de la carpa al all inclusive en Foz", con compras en Paraguay y el lado argentino.

Vimos el proyecto Influencers Experience y nos encantaría participar, con apoyo de hospedaje y atracciones asociadas. ${KIT_ES}

¿Podemos enviarles una propuesta con el itinerario?`,
    8: `${ABRE_ES}

João y yo creamos contenido sobre viajes, camping y hospedajes para un público brasileño, y entre el 13 y el 17 de diciembre vamos a estar en la región de Foz. ¡Encontramos {marca} y nos encantó el lugar!

Nos encantaría hospedarnos ahí y mostrar la casa como hacemos en nuestros videos: la llegada, los rincones, la estructura y lo que hace que la estadía valga la pena. Pensamos en una alianza: un descuento o algunas noches a cambio de un video mostrando la casa, y el contenido queda también para ustedes.

${KIT_ES}

¿Les gustaría conversar sobre esto? 😊`,
    9: `${ABRE_ES}

João y yo creamos contenido sobre viajes, camping y experiencias reales, para un público brasileño que planea y viaja de verdad. Entre el 13 y el 17 de diciembre vamos a Foz do Iguaçu, Paraguay y el lado argentino, y queremos planear y reservar los paseos del viaje con {marca}.

La idea es mostrar en la práctica cómo funciona: armar el itinerario, elegir y reservar los paseos (Cataratas, Macuco, Itaipú...) y contar si valió la pena el día de la experiencia. Un contenido que responde la duda de quien está planeando las vacaciones de diciembre.

En los últimos 30 días llegamos a {alcance} cuentas. ${KIT_ES}

¿Tienen un programa con creadores de contenido? ¿Con quién podemos hablar?`,
    f: `¡Hola, {saudação}! Paso por aquí de nuevo 😊 Nuestro viaje a Foz se acerca (13 al 17/12) y esta semana estamos cerrando el itinerario de grabaciones. Todavía hay tiempo de incluir a {marca}. ¿Con quién podemos hablar?`,
  };

  // ---------- inglês ----------
  const ABRE_EN = "Hi {saudação}! How are you? This is Nath, from Vai Ter Estrada 🏕️";
  const KIT_EN = "Our media kit, with videos and up-to-date numbers: https://vaiterestrada.github.io/midiakit/";
  const MENSAGENS_EN = {
    1: `${ABRE_EN}

João and I create content about travel, camping and real experiences for a Brazilian audience. From December 13 to 17 we're heading to Foz do Iguaçu and Paraguay on a mission: upgrade our phones (iPhone Pro Max) and, if we can, bring home a MacBook and a drone for our content.

The idea is to show this purchase for real, from start to finish: the store, the service, the price, the warranty and the unboxing. And we'd love for it to happen at {marca}.

In the last 30 days we reached {alcance} accounts, with an audience that plans and actually travels. ${KIT_EN}

Who could we talk to about content and influencer partnerships?`,
    2: `${ABRE_EN}

João and I create content about travel, camping and places to stay for a Brazilian audience. From December 13 to 17 we'll be in Foz do Iguaçu and Paraguay, filming a series: "from tent to all-inclusive in Foz".

We'd love to tell the story of {marca}: the arrival, the facilities, what's included and the details that make the trip worth it, right at the start of the December holidays.

In the last 30 days we reached {alcance} accounts, audience: {público}. ${KIT_EN}

Who could we talk to about content and influencer partnerships? Email or WhatsApp works 😊`,
    3: `${ABRE_EN}

We create camping and road trip content for a Brazilian audience, and from December 13 to 17 we'll be around Iguazu Falls. One of the questions we get the most is "where can we camp near the Falls?", and {marca} is one of the places that keeps coming up.

Could we stop by to film your facilities and show how everything works, the way we do in our videos: the arrival, the spaces, what's there for people coming with a tent or a motorhome? You get to keep and use the content too.

${KIT_EN}

Who could we talk to about this?`,
    4: `${ABRE_EN}

João and I will be in Foz do Iguaçu from December 13 to 17, filming a series about the region for a Brazilian audience, and {marca} is on our itinerary. We'd love to show the real experience, the way we do in our videos: the arrival, the tour and what makes the visit worth it.

In the last 30 days we reached {alcance} accounts. ${KIT_EN}

Do you work with content creators? Who could we talk to?`,
    5: `${ABRE_EN}

João and I will be in the Foz do Iguaçu area from December 13 to 17, filming a series about the trip, and {marca} is a must-stop on our list. We'd love to show the full experience, from the atmosphere to the food.

${KIT_EN}

Would you be open to a partnership in exchange for content? Who could we talk to? 😊`,
    6: `${ABRE_EN}

From December 13 to 17 João and I are heading to Foz do Iguaçu and Paraguay, and a question everyone has is "how do you get around between Foz, Paraguay and the attractions?". We'd love to answer it by showing {marca}'s service in practice.

In the last 30 days we reached {alcance} accounts. ${KIT_EN}

Who could we talk to about content and influencer partnerships?`,
    7: `Hi Visit Iguassu team! How are you? This is Nath, from Vai Ter Estrada 🏕️

João and I create content about travel, camping and places to stay, for an adult Brazilian audience that plans and actually travels, mostly from São Paulo. From December 13 to 17 we'll be in Foz do Iguaçu filming a series about the region: "from tent to all-inclusive in Foz", with shopping in Paraguay and the Argentine side.

We saw the Influencers Experience project and would love to take part, with support for accommodation and partner attractions. ${KIT_EN}

Could we send you a proposal with the itinerary?`,
    8: `${ABRE_EN}

João and I create content about travel, camping and places to stay for a Brazilian audience, and from December 13 to 17 we'll be in Foz do Iguaçu. We came across {marca} and loved it!

We'd love to stay with you and show the place the way we do in our videos: the arrival, the little corners, the facilities and what makes the stay worth it. Our idea is a partnership: a discount or a few nights in exchange for a video showing the house, and you get to keep and use the content too.

${KIT_EN}

Would you be open to talking about it? 😊`,
    9: `${ABRE_EN}

João and I create content about travel, camping and real experiences, for a Brazilian audience that plans and actually travels. From December 13 to 17 we're heading to Foz do Iguaçu, Paraguay and the Argentine side, and we'd love to plan and book the trip's tours with {marca}.

The idea is to show how it works in practice: building the itinerary, choosing and booking the tours (Iguazu Falls, Macuco Safari, Itaipu...) and telling our audience whether it was worth it on the day. Content that answers the questions of everyone planning their December holidays.

In the last 30 days we reached {alcance} accounts. ${KIT_EN}

Do you have a creator program? Who could we talk to?`,
    f: `Hi {saudação}! Just following up 😊 Our trip to Foz is coming up (Dec 13–17) and we're finalizing our filming schedule this week. There's still time to include {marca}. Who could we talk to?`,
  };

  const IDIOMAS = [
    { v: "pt", t: "PT", nome: "português", padrao: "pessoal" },
    { v: "es", t: "ES", nome: "espanhol", padrao: "equipo" },
    { v: "en", t: "EN", nome: "inglês", padrao: "there" },
  ];
  // o idioma fica guardado numa linha das notas ("Idioma: espanhol"); "inglês" também
  // faz o Quadro sugerir os follow-ups em inglês
  function idiomaDe(c) {
    const m = String(c.notas || "").match(/^Idioma: (\S+)/m);
    const v = m && IDIOMAS.find((i) => i.nome === m[1].replace(/\.$/, ""));
    return v ? v.v : "pt";
  }
  // números do robô vêm em português: "16,9 mil", "58% mulheres, 63% entre 35 e 54 anos"
  function numerosNo(idioma) {
    if (idioma === "pt") return numeros;
    const n = { ...numeros };
    for (const k of Object.keys(n)) {
      let v = String(n[k]);
      if (idioma === "en") {
        v = v.replace(/(\d+),(\d) mil/g, "$1.$2K").replace(/(\d+) mil/g, "$1K")
          .replace(/mulheres/g, "women").replace(/homens/g, "men").replace(/entre (\d+) e (\d+) anos/g, "aged $1 to $2");
      } else {
        v = v.replace(/mulheres/g, "mujeres").replace(/homens/g, "hombres").replace(/entre (\d+) e (\d+) anos/g, "entre $1 y $2 años");
      }
      n[k] = v;
    }
    return n;
  }

  let el = null;
  let contatos = [];
  let numeros = {};
  let filtroTipo = "todos";
  let filtroStatus = "todos";

  // ---------- datas ----------
  const pad = (n) => String(n).padStart(2, "0");
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const paraData = (s) => { const [a, m, d] = String(s).split("-").map(Number); return new Date(a, m - 1, d); };
  const diasAte = (s) => Math.round((paraData(s) - paraData(hoje())) / 864e5);
  const dataBr = (s) => { const [, m, d] = String(s).split("-"); return `${d}/${m}`; };

  // ---------- o que vem nas notas ----------
  function info(c) {
    const l1 = String(c.notas || "").split("\n")[0];
    const pri = (l1.match(/prioridade ([AB])/) || [])[1] || "B";
    const n = (l1.match(/nº (\d)/) || [])[1] || "4";
    const prop = ((l1.match(/prioridade [AB]\. (.*?)(?: Mensagem:|$)/) || [])[1] || "").trim();
    return { pri, n, prop };
  }
  const arroba = (c) => String(c.instagram || "").replace(/^@/, "");
  function saudacao(c, idioma) {
    const nome = String(c.contato || "").split(/[·|,;]/).map((s) => s.trim())
      .find((s) => /[A-Za-zÀ-ú]/.test(s) && !/@|https?:|\d{4}/.test(s));
    return nome || IDIOMAS.find((i) => i.v === idioma).padrao;
  }
  function mensagem(c, qual) {
    const idioma = idiomaDe(c);
    const texto = idioma === "es" ? MENSAGENS_ES[qual] : idioma === "en" ? MENSAGENS_EN[qual] : MENSAGENS[qual].texto;
    const s = saudacao(c, idioma);
    const valores = { ...numerosNo(idioma), marca: c.marca, "saudação": s, saudacao: s };
    return texto.replace(/\{([^{}\n]{1,30})\}/g, (x, k) => valores[k.trim()] || x);
  }

  // =================================================================
  async function render(alvo) {
    el = alvo;
    el.onclick = aoClicar;
    el.onchange = aoMudar;
    el.innerHTML = `<div class="card"><p class="muted">Carregando a viagem...</p></div>`;
    const [lista, nums, analises] = await Promise.all([
      Dados.listarAbord("abord_contatos", "vaiterestrada"),
      Abordagens.numerosVte ? Abordagens.numerosVte() : {},
      Dados.listar("analises").catch(() => []),
    ]);
    contatos = lista.filter(ehDaViagem);
    numeros = nums || {};
    const linha = (Array.isArray(analises) ? analises : []).find((a) => a.perfil === PERFIL_CHECKS);
    checks = { id: linha?.id || null, feitos: linha?.conteudo?.feitos || {} };
    desenhar();
  }

  // follow-up vencendo (mesma regra do painel: 3 dias, depois 2)
  const somaDias = (s, n) => { const d = paraData(s); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  function followupVencido(c) {
    if (!["enviado", "time", "conversando", "proposta"].includes(c.status) || c.tipo === "plataforma") return false;
    const n = c.followups || 0;
    if (n >= 2) return false;
    return somaDias(c.ultimo_envio, [3, 2][n]) <= hoje();
  }

  function etapaFeita(e, h) {
    if (e.manual) return !!checks.feitos[e.id];
    return e.feito(contatos, h);
  }

  async function marcarEtapa(id) {
    const feitos = { ...checks.feitos, [id]: !checks.feitos[id] };
    const r = await Dados.salvar("analises", { ...(checks.id ? { id: checks.id } : {}), perfil: PERFIL_CHECKS, conteudo: { feitos } });
    if (r?.erro) return toast(r.erro, "erro");
    checks = { id: r?.row?.id || checks.id, feitos };
    desenhar();
  }

  function desenhar() {
    el.innerHTML = blocoTopo() + blocoMarcas() + blocoMensagens();
  }

  // ---------- contagem + cronograma ----------
  function blocoTopo() {
    const faltam = diasAte(IDA);
    const h = hoje();
    const feitas = ETAPAS.map((e) => etapaFeita(e, h));
    const atual = feitas.findIndex((f) => !f);
    const vencidos = h <= FIM_FOLLOWUP ? contatos.filter(followupVencido).length : 0;
    const extra = (e) => {
      if (e.id === "a" || e.id === "b") {
        const n = contatos.filter((c) => c.status === "a_enviar" && (e.id === "a" ? info(c).pri === "A" : info(c).pri !== "A")).length;
        return n ? ` <span class="muted">· faltam ${n}</span>` : "";
      }
      if (e.id === "fu" && vencidos) return ` <span class="muted">· ${vencidos} pra fazer hoje</span>`;
      if (e.id === "fechar" && h >= INICIO_FECHAR) {
        const n = contatos.filter((c) => ABERTAS.includes(c.status)).length;
        return n ? ` <span class="muted">· ${n} conversas abertas</span>` : "";
      }
      return "";
    };
    const etapas = ETAPAS.map((e, i) => {
      const classe = feitas[i] ? "feita" : i === atual ? "agora" : "";
      const marca = feitas[i] ? "✓" : "";
      const botao = e.manual
        ? `<button class="viagem-check ${feitas[i] ? "ok" : ""}" data-acao="etapa" data-etapa="${e.id}" aria-label="${feitas[i] ? "Desmarcar" : "Marcar como feito"}: ${esc(e.t)}">${marca}</button>`
        : `<span class="viagem-check ${feitas[i] ? "ok" : ""}" aria-hidden="true">${marca}</span>`;
      const quando = e.de ? `${dataBr(e.de)} a ${dataBr(e.ate)}` : `até ${dataBr(e.ate)}`;
      return `<li class="${classe}">${botao}<span>${quando}</span><span class="viagem-etapa-t">${esc(e.t)}${feitas[i] ? "" : extra(e)}</span>${i === atual ? ' <span class="selo selo-ok">agora</span>' : ""}</li>`;
    }).join("");
    const cont = (f) => contatos.filter(f).length;
    const kpis = [
      ["Marcas", contatos.length],
      ["A contatar", cont((c) => c.status === "a_enviar")],
      ["Enviadas", cont((c) => c.status === "enviado")],
      ["Responderam", cont((c) => RESPONDEU.includes(c.status))],
      ["Fechadas", cont((c) => c.status === "fechou")],
    ];
    const contagem = faltam > 0 ? `faltam <strong>${faltam} dias</strong> pra viagem`
      : diasAte(VOLTA) >= 0 ? "<strong>é agora!</strong> Bora gravar" : "viagem feita 🎉";
    return `
      <div class="viagem-topo card">
        <div class="viagem-titulo">
          <div>
            <h2>🇵🇾 Foz do Iguaçu · Paraguai · Argentina</h2>
            <p class="muted">13 a 17/12 (previsão, passagens no começo de dezembro) · ${contagem}</p>
            <p class="muted viagem-meta">Missão: iPhone Pro Max → MacBook → drone → câmera pequena (Osmo Action)</p>
          </div>
        </div>
        <div class="viagem-kpis">${kpis.map(([r, v]) => `<div class="viagem-kpi"><span class="kpi-valor">${v}</span><span class="muted">${r}</span></div>`).join("")}</div>
        <ol class="viagem-etapas">
          ${etapas}
        </ol>
        <p class="muted viagem-meta">As etapas ganham ✓ sozinhas quando o painel vê que você já fez. As que têm quadradinho você marca com um toque.</p>
      </div>`;
  }

  // ---------- marcas ----------
  function blocoMarcas() {
    const lista = contatos.filter((c) => {
      const i = info(c);
      if (filtroTipo !== "todos" && grupoDe(i.n) !== filtroTipo) return false;
      if (filtroStatus === "contatar") return c.status === "a_enviar";
      if (filtroStatus === "andamento") return ["enviado", ...RESPONDEU].includes(c.status);
      if (filtroStatus === "fechadas") return c.status === "fechou";
      return true;
    });
    const filtros = `
      <div class="viagem-filtros">
        <select data-filtro="tipo" aria-label="Tipo">
          <option value="todos">Todos os tipos</option>
          ${TIPOS.map((t) => `<option value="${t.n}" ${filtroTipo === t.n ? "selected" : ""}>${t.t}</option>`).join("")}
        </select>
        <select data-filtro="status" aria-label="Status">
          ${[["todos", "Todos os status"], ["contatar", "A contatar"], ["andamento", "Em andamento"], ["fechadas", "Fechadas"]]
            .map(([v, t]) => `<option value="${v}" ${filtroStatus === v ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>`;
    const grupos = TIPOS.map((t) => {
      const doTipo = lista.filter((c) => grupoDe(info(c).n) === t.n)
        .sort((a, b) => info(a).pri.localeCompare(info(b).pri) || a.marca.localeCompare(b.marca));
      if (!doTipo.length) return "";
      return `<h3 class="viagem-grupo">${t.t} <span class="muted">(${doTipo.length})</span></h3>
        <div class="viagem-lista">${doTipo.map(linhaMarca).join("")}</div>`;
    }).join("");
    return `
      <div class="viagem-cab-secao">
        <h2>Marcas da viagem</h2>
        ${filtros}
      </div>
      ${grupos || `<div class="card vazio"><p>Nenhuma marca nesse filtro.</p></div>`}`;
  }

  function linhaMarca(c) {
    const i = info(c);
    const h = arroba(c);
    const link = h ? `<a href="https://www.instagram.com/${encodeURIComponent(h)}/" target="_blank" rel="noopener">@${esc(h)}</a>` : `<span class="muted">sem Instagram</span>`;
    const naoEnviada = c.status === "a_enviar";
    const envio = naoEnviada ? "" : `<span class="muted">· 1ª msg ${dataBr(c.primeiro_envio)}${c.followups ? ` · ${c.followups} follow-up${c.followups > 1 ? "s" : ""}` : ""}</span>`;
    return `
      <div class="card viagem-marca ${c.status === "fechou" ? "fechada" : ""}">
        <div class="viagem-marca-info">
          <div class="viagem-marca-nome"><strong>${esc(c.marca)}</strong> <span class="chip viagem-pri-${i.pri}">${i.pri}</span> ${link} ${envio}</div>
          <div class="muted viagem-prop">${esc(i.prop || c.produto || "")}</div>
          <details class="viagem-previa">
            <summary>Ver a mensagem (${esc(MENSAGENS[naoEnviada ? i.n : "f"].t)} · ${idiomaDe(c).toUpperCase()})</summary>
            <pre>${esc(mensagem(c, naoEnviada ? i.n : "f"))}</pre>
          </details>
        </div>
        <div class="viagem-marca-acoes">
          <div class="viagem-idiomas" role="group" aria-label="Idioma da mensagem pra ${esc(c.marca)}">
            ${IDIOMAS.map((l) => `<button class="${idiomaDe(c) === l.v ? "ativo" : ""}" data-acao="idioma" data-id="${esc(c.id)}" data-v="${l.v}" title="Mensagem em ${l.nome}">${l.t}</button>`).join("")}
          </div>
          <select data-status="${esc(c.id)}" aria-label="Status de ${esc(c.marca)}">
            ${STATUS.map((s) => `<option value="${s.v}" ${s.v === c.status ? "selected" : ""}>${s.t}</option>`).join("")}
          </select>
          ${naoEnviada || hoje() <= FIM_FOLLOWUP ? `<button class="btn btn-sm" data-acao="copiar" data-id="${esc(c.id)}" data-qual="${naoEnviada ? i.n : "f"}">📋 ${naoEnviada ? "Copiar mensagem" : "Copiar follow-up"}</button>` : ""}
          ${naoEnviada ? `<button class="btn btn-sm btn-primario" data-acao="enviei" data-id="${esc(c.id)}">Enviei</button>` : ""}
        </div>
      </div>`;
  }

  // ---------- mensagens ----------
  function blocoMensagens() {
    return `
      <h2 class="viagem-cab-secao">Mensagens da viagem</h2>
      <p class="muted">O botão "Copiar mensagem" de cada marca já usa a mensagem certa e preenche o nome. Aqui ficam os textos pra consultar.</p>
      <div class="viagem-msgs">
        ${Object.entries(MENSAGENS).map(([k, m]) => `
          <details class="card viagem-msg">
            <summary><strong>${k === "f" ? "🔁" : k + "."} ${esc(m.t)}</strong></summary>
            <pre>${esc(m.texto)}</pre>
          </details>`).join("")}
      </div>`;
  }

  // ---------- ações ----------
  async function copiarTexto(t) {
    try { await navigator.clipboard.writeText(t); }
    catch {
      const a = document.createElement("textarea");
      a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove();
    }
  }

  async function salvar(c, mud, msg) {
    const r = await Dados.salvarAbord("abord_contatos", { ...c, ...mud });
    if (r.erro) return toast(r.erro, "erro");
    Object.assign(c, r.row || mud);
    desenhar();
    if (msg) toast(msg, "ok");
  }

  async function aoClicar(ev) {
    const b = ev.target.closest("[data-acao]");
    if (!b) return;
    if (b.dataset.acao === "etapa") return marcarEtapa(b.dataset.etapa);
    const c = contatos.find((x) => x.id === b.dataset.id);
    if (!c) return;
    if (b.dataset.acao === "copiar") {
      const texto = mensagem(c, b.dataset.qual);
      await copiarTexto(texto);
      const falta = [...texto.matchAll(/\{([^{}\n]{1,30})\}/g)].map((m) => m[1]);
      const nome = MENSAGENS[b.dataset.qual].t.toLowerCase();
      const lingua = IDIOMAS.find((l) => l.v === idiomaDe(c)).nome;
      toast(falta.length ? `Copiado. Falta preencher: ${falta.join(", ")}` : `Mensagem de ${nome} copiada em ${lingua} ✓`, falta.length ? "aviso" : "ok");
    } else if (b.dataset.acao === "idioma") {
      const novo = IDIOMAS.find((l) => l.v === b.dataset.v);
      if (!novo || idiomaDe(c) === novo.v) return;
      const semIdioma = String(c.notas || "").split("\n").filter((l) => !/^Idioma: /.test(l));
      if (novo.v !== "pt") semIdioma.push(`Idioma: ${novo.nome}`);
      await salvar(c, { notas: semIdioma.join("\n") }, `${c.marca}: mensagens em ${novo.nome}.`);
    } else if (b.dataset.acao === "enviei") {
      const h = hoje();
      await salvar(c, {
        status: "enviado", primeiro_envio: h, ultimo_envio: h, followups: 0,
        notas: `${c.notas}\n${dataBr(h)}: 1ª mensagem (aba Viagem Paraguai).`,
      }, `${c.marca} foi pro Controle. O follow-up aparece no Quadro.`);
    }
  }

  async function aoMudar(ev) {
    const f = ev.target.dataset.filtro;
    if (f === "tipo") { filtroTipo = ev.target.value; return desenhar(); }
    if (f === "status") { filtroStatus = ev.target.value; return desenhar(); }
    const id = ev.target.dataset.status;
    if (!id) return;
    const c = contatos.find((x) => x.id === id);
    if (!c) return;
    const novo = ev.target.value;
    const mud = { status: novo };
    if (c.status === "a_enviar" && novo !== "a_enviar") { mud.primeiro_envio = hoje(); mud.ultimo_envio = hoje(); }
    await salvar(c, mud, "Status atualizado.");
  }

  return { render, ehDaViagem };
})();

/* OTR — page behavior: i18n, intro, nav, reveals, counters,
   marquee, voicewaves, clarity beam, OTR soundwave. */
(function () {
  window.__OTR_BUILD = 12;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- i18n ---------------- */
  const I18N = {
    es: {
      nav_method:'El Método', nav_proof:'Resultados', nav_story:'Nosotros', cta_short:'Reserva tu consulta',
      hero_eyebrow:'Academia #1 del circuito de debate dominicano',
      hero_h1_a:'Domina', hero_h1_b:'la sala.', hero_sig:'Own the Room.',
      hero_sub:'Convertimos estudiantes en líderes que hablan con autoridad, claridad y dominio de cada escenario.',
      hero_cta1:'Reserva tu consulta gratis', hero_cta2:'Mira las transformaciones',
      mp1_b:"Harvard JV '25", mp1_t:'Campeones', mp2_b:"Blue Key '24", mp2_t:'Octofinalistas · Top Speakers', mp3:'Resultados visibles en menos de 30 días',
      scroll:'Desliza', verified:'Academia verificada · #1 del circuito dominicano',
      stat_conf:'Tasa de mejora en confianza de nuestros estudiantes.',
      stat_students:'Estudiantes entrenados en 2025.',
      stat_days:'Días para ver resultados visibles en tu forma de hablar.',
      stat_tourn:'Torneos internacionales competidos.',
      pain_eyebrow:'El obstáculo número uno', pain_strike:'barrera #1',
      pain_h2b:'Nosotros lo convertimos en tu mayor ventaja.',
      pain_p1:'El nudo en la garganta, las manos que tiemblan, la mente en blanco. No es falta de talento: es falta de método. Y el método se entrena.',
      pain_p2:'En OTR no escondemos el miedo — lo usamos como combustible. En semanas, ese mismo estudiante toma el micrófono y la sala se queda en silencio para escucharlo.',
      ba_before:'Antes', ba_after:'Después', ba_q1:'"No sabía ni cómo empezar."', ba_q2:'"Subí al podio y gané la sala."',
      method_eyebrow:'El Método OTR', method_h2:'Cuatro pasos para subir del piso al escenario.',
      m1_t:'Diagnóstico', m1_d:'Medimos voz, estructura y presencia. Sabemos exactamente dónde estás y a dónde puedes llegar.', m1_m:'Semana 1',
      m2_t:'Entrenamiento élite', m2_d:'Argumentación, retórica y control escénico con entrenadores campeones. Repetición deliberada.', m2_m:'Núcleo',
      m3_t:'Simulacros con jueces', m3_d:'Rondas reales bajo presión, con jueces que puntúan como en un torneo. Feedback quirúrgico.', m3_m:'Presión real',
      m4_t:'Torneos', m4_d:'Competimos. El estudiante defiende sus ideas en el escenario y vuelve con resultados, no con teoría.', m4_m:'El escenario',
      method_anchor_pre:'La preparación no es suerte. Es ', method_anchor_em:'disciplina convertida en resultados.',
      wave_cap:'Tu voz, con forma', wave_sub:'— Own the Room —', foot_results:'Resultados no negociables.',
      skip:'Saltar intro', back:'Volver', final_h:'Es tu turno de subir al escenario.',
      r_eyebrow:'Resultados', r_h1:'La prueba está en el escenario.',
      r_sub:'No vendemos promesas. Mostramos podios, finales y trofeos — resultados que se pueden verificar.',
      r_tf_title:'Transformaciones reales', r_tf_cnt:'Antes → Después',
      r_palm_title:'Palmarés internacional', r_palm_cnt:'2024 → hoy',
      palm_champ:'Campeones', palm_champ2:'Campeones', palm_champ3:'Campeones', palm_octo:'Octofinalistas · Doble Top Speakers', palm_semi:'Semifinalistas', palm_semi2:'Semifinalistas', palm_first:'1er lugar', palm_gold:'Medalla de oro',
      c1_before:'Nunca habían roto en un torneo oficial.', c1_after:"14 rondas consecutivas ganadas · Campeones de New Horizons · Co-campeones de St. Michael's · mejor récord Novice dominicano en Blue Key.", c1_result:'Campeones', c1_time:'<3 meses',
      c2_before:'Luchaban con discursos de 4 minutos; nunca habían roto en un torneo.', c2_after:'Rompieron en Florida Blue Key · Sigmund ganó un Novice Speaking Award — su mayor salto competitivo.', c2_result:'Beca completa', c2_time:'1 temporada',
      c3_before:'Nunca habían llegado a una ronda final.', c3_after:"Equipo Varsity #1 del circuito dominicano · finales back-to-back · Campeonas de New Horizons · Co-campeonas de St. Michael's.", c3_result:'1er lugar', c3_time:'Back-to-back',
      r_wall_title:'Muro de pruebas', r_wall_cnt:'Harvard · Blue Key · TOC · NSDA',
      ph_case1:'foto · Isabella & Aaron', ph_case2:'foto · Jose & Sigmund', ph_case3:'foto · Analia & Silvana',
      g_eyebrow:'Garantía OTR', g_h2:'Resultados visibles en 30 días.', g_days:'DÍAS',
      g_p:'Si el alumno se presenta y sigue el sistema, los resultados no se negocian. Registramos tu progreso desde el día uno: a los 30 días verás cambios visibles en tu desempeño y contenido — para coaches, jueces y compañeros.',
      g_note:'Consulta gratis + hoja de ruta personalizada incluida.',
      faq_h:'Preguntas frecuentes', faq_cnt:'La confianza empieza con claridad',
      faq1_q:'¿Qué tan rápido veré resultados?', faq1_a:'Rápido. La mayoría siente la diferencia en las primeras 2–3 semanas, y a los 30 días el cambio es visible para coaches, jueces y compañeros. Si el alumno se presenta y sigue el sistema, los resultados no se negocian.',
      faq2_q:'¿Necesito experiencia previa?', faq2_a:'No — y de hecho es una ventaja. Hemos tomado estudiantes con cero experiencia en debate y los convertimos en competidores que ganan torneos. Sin malos hábitos, sin métodos viejos: un sistema limpio y élite. Los principiantes suben rápido; los avanzados, más rápido.',
      faq3_q:'¿Cuánto tiempo requiere?', faq3_a:'Trabajamos con estudiantes serios. Compromiso mínimo: 2–4 horas enfocadas por semana — suficiente para superar a la mayoría de los programas escolares. Quien invierte más tiempo, escala más rápido. El esfuerzo es directamente igual al resultado.',
      faq4_q:'¿Qué hace a OTR diferente de un programa escolar?', faq4_a:"Simple: las escuelas enseñan participación y bases. Nosotros te damos acceso a las estrategias con las que nuestros coaches han ganado a nivel nacional e internacional: Harvard, Florida Blue Key, Tournament of Champions, NSDA, New Horizons, St. Michael's y más.",
      faq5_q:'¿Hay acompañamiento después de inscribirme?', faq5_a:'Sí. Esto no es “paga y desaparece”: recibes feedback continuo, tracking de desempeño, guía estratégica y acceso directo a coaches élite. Nos mantenemos involucrados y subimos el estándar cada semana.',
      faq6_q:'¿Y al terminar el programa?', faq6_a:'Graduarte de OTR significa acceso de por vida a una red élite de coaches, competidores, mentores y conexiones internacionales. Las oportunidades no terminan cuando termina el programa.',
      faq7_q:'¿Con qué edades trabajan?', faq7_a:'Desde los 10 años. La colocación se basa en habilidad y ambición, no solo en edad. Si un estudiante está listo para subir de nivel, le hacemos espacio.',
      ph_harvard:"foto · Harvard '26", ph_final:'foto · Final Nacional', ph_podio:'foto · Podio',
      ph_trophy:'foto · Trofeo', ph_stage:'foto · En escena', ph_team:'foto · Equipo OTR', ph_story:'foto · Equipo OTR en torneo',
      ph_coach1:'foto · coach 01', ph_coach2:'foto · coach 02', ph_coach3:'foto · coach 03',
      n_eyebrow:'Nosotros', n_h1:'Por estudiantes, para estudiantes.',
      n_sub:'Los mejores entrenadores de debate son los que acaban de ganar. Esa es la idea que nos hizo #1.',
      n_p1:'OTR nació de una idea simple: los mejores entrenadores de debate son los que acaban de ganar. Campeones que enseñan lo que funciona hoy, no hace diez años.',
      n_p2:'En un año nos convertimos en la academia #1 del circuito dominicano. No por suerte — por un sistema obsesionado con resultados, repetición y mentalidad de campeón.',
      n_coaches_title:'Entrenadores campeones', n_coaches_cnt:'Campeones que entrenan campeones',
      coach1_r:'Dirección técnica', coach1_c:'10 campeonatos como entrenador en el circuito nacional e internacional.', coach1_p:'Head Coach',
      coach2_r:'Public Forum', coach2_c:'Finalista internacional. Especialista en argumentación y casos de impacto.', coach2_p:'Estrategia',
      coach3_r:'Oratoria', coach3_c:'Coach de oratoria competitiva. Voz, presencia y control escénico.', coach3_p:'Presencia',
      n_values_title:'Lo que no se negocia.',
      v1_t:'Disciplina', v1_d:'La preparación no es suerte. Es repetición deliberada, semana tras semana.',
      v2_t:'Claridad', v2_d:'Pensar claro para hablar claro. Estructura antes que adorno.',
      v3_t:'Mentalidad de campeón', v3_d:'Competir, perder, ajustar y volver. Hasta ganar la sala.',
      marquee:["Harvard JV '25 — Campeones","Florida Blue Key '24","Tournament of Champions","New Horizons — Campeones","St. Michael's — Co-campeones","Circuito Nacional RD — Campeones","Caribbean Debate Series — Oro","NSDA"]
    },
    en: {
      nav_method:'The Method', nav_proof:'Results', nav_story:'About', cta_short:'Book your call',
      hero_eyebrow:'#1 academy of the Dominican debate circuit',
      hero_h1_a:'Own', hero_h1_b:'the room.', hero_sig:'Domina la sala.',
      hero_sub:'We turn students into leaders who speak with authority, clarity and command of every stage.',
      hero_cta1:'Book your free consultation', hero_cta2:'See the transformations',
      mp1_b:"Harvard JV '25", mp1_t:'Champions', mp2_b:"Blue Key '24", mp2_t:'Octofinalists · Top Speakers', mp3:'Visible results in under 30 days',
      scroll:'Scroll', verified:'Verified academy · #1 in the Dominican circuit',
      stat_conf:'Confidence improvement rate across our students.',
      stat_students:'Students trained in 2025.',
      stat_days:'Days to see visible results in the way you speak.',
      stat_tourn:'International tournaments competed.',
      pain_eyebrow:'The number-one obstacle', pain_strike:'#1 barrier',
      pain_h2b:'We turn it into your greatest advantage.',
      pain_p1:'The knot in your throat, the shaking hands, the blank mind. It is not a lack of talent — it is a lack of method. And method can be trained.',
      pain_p2:'At OTR we do not hide the fear — we use it as fuel. In weeks, that same student takes the mic and the room goes silent to listen.',
      ba_before:'Before', ba_after:'After', ba_q1:'"I didn\u2019t even know how to start."', ba_q2:'"I took the podium and won the room."',
      method_eyebrow:'The OTR Method', method_h2:'Four steps from the floor to the stage.',
      m1_t:'Diagnosis', m1_d:'We measure voice, structure and presence. We know exactly where you are and how far you can go.', m1_m:'Week 1',
      m2_t:'Elite training', m2_d:'Argumentation, rhetoric and stage control with champion coaches. Deliberate repetition.', m2_m:'Core',
      m3_t:'Judged mock rounds', m3_d:'Real rounds under pressure, with judges scoring like a tournament. Surgical feedback.', m3_m:'Real pressure',
      m4_t:'Tournaments', m4_d:'We compete. The student defends their ideas on stage and returns with results, not theory.', m4_m:'The stage',
      method_anchor_pre:'Preparation is not luck. It is ', method_anchor_em:'discipline turned into results.',
      wave_cap:'Your voice, given shape', wave_sub:'— Domina la sala —', foot_results:'Results are non-negotiable.',
      skip:'Skip intro', back:'Back', final_h:"It's your turn to take the stage.",
      r_eyebrow:'Results', r_h1:'The proof is on the stage.',
      r_sub:'We don\u2019t sell promises. We show podiums, finals and trophies — results you can verify.',
      r_tf_title:'Real transformations', r_tf_cnt:'Before → After',
      r_palm_title:'International record', r_palm_cnt:'2024 → today',
      palm_champ:'Champions', palm_champ2:'Champions', palm_champ3:'Champions', palm_octo:'Octofinalists · Double Top Speakers', palm_semi:'Semifinalists', palm_semi2:'Semifinalists', palm_first:'First place', palm_gold:'Gold medal',
      c1_before:'Had never broken at an official tournament.', c1_after:"Won 14 consecutive rounds · New Horizons Champions · St. Michael's Co-Champions · best Dominican Novice record at Blue Key.", c1_result:'Champions', c1_time:'<3 months',
      c2_before:'Struggled with 4-minute speeches; had never broken at a tournament.', c2_after:'Broke at Florida Blue Key · Sigmund earned a Novice Speaking Award — their biggest competitive leap.', c2_result:'Full scholarship', c2_time:'1 season',
      c3_before:'Had never reached a finals round.', c3_after:"Top Varsity team in the Dominican circuit · back-to-back finals · New Horizons Champions · St. Michael's Co-Champions.", c3_result:'First place', c3_time:'Back-to-back',
      r_wall_title:'Proof wall', r_wall_cnt:'Harvard · Blue Key · TOC · NSDA',
      ph_case1:'photo · Isabella & Aaron', ph_case2:'photo · Jose & Sigmund', ph_case3:'photo · Analia & Silvana',
      g_eyebrow:'The OTR Guarantee', g_h2:'Visible results in 30 days.', g_days:'DAYS',
      g_p:'If the student shows up and follows the system, results are non-negotiable. We track your progress from day one: at 30 days the change is visible in your performance and content — to coaches, judges and peers.',
      g_note:'Free consultation + personalized roadmap included.',
      faq_h:'Frequently asked questions', faq_cnt:'Confidence starts with clarity',
      faq1_q:'How soon will I see results?', faq1_a:'Fast. Most students feel the difference in the first 2–3 weeks, and by 30 days the change is visible to coaches, judges and peers. If the student shows up and follows the system, results are non-negotiable.',
      faq2_q:'Do I need prior experience?', faq2_a:'No — and that is actually an advantage. We have taken students with zero debate background and turned them into tournament-winning competitors. No bad habits, no outdated methods: a clean, elite system. Beginners rise fast; experienced students rise even faster.',
      faq3_q:'How much time does it require?', faq3_a:'We work with serious students only. Minimum commitment: 2–4 focused hours per week — enough to outperform most school programs. Students who invest more time scale even faster. Effort directly equals outcome.',
      faq4_q:'What makes OTR different from school programs?', faq4_a:"Simple: schools teach participation and basics. We give you access to the strategies our coaches have used to win at national and international levels: Harvard, Florida Blue Key, Tournament of Champions, NSDA, New Horizons, St. Michael's and more.",
      faq5_q:'Is there ongoing support after enrollment?', faq5_a:'Yes. This is not a “pay and disappear” program: you get continuous feedback, performance tracking, strategic guidance and direct access to elite coaches. We stay involved and raise the standard every week.',
      faq6_q:'What about after completing the program?', faq6_a:'Graduating OTR means lifelong access to an elite network of coaches, competitors, mentors and international connections. Opportunities do not end when the program does.',
      faq7_q:'What age groups do you work with?', faq7_a:'Ages 10 and up. Placement is based on ability and ambition, not just age. If a student is ready to level up, we make space for them.',
      ph_harvard:"photo · Harvard '26", ph_final:'photo · National Final', ph_podio:'photo · Podium',
      ph_trophy:'photo · Trophy', ph_stage:'photo · On stage', ph_team:'photo · OTR team', ph_story:'photo · OTR team at a tournament',
      ph_coach1:'photo · coach 01', ph_coach2:'photo · coach 02', ph_coach3:'photo · coach 03',
      n_eyebrow:'About', n_h1:'By students, for students.',
      n_sub:'The best debate coaches are the ones who just won. That is the idea that made us #1.',
      n_p1:'OTR was born from a simple idea: the best debate coaches are the ones who just won. Champions who teach what works today, not ten years ago.',
      n_p2:'In one year we became the #1 academy of the Dominican circuit. Not by luck — through a system obsessed with results, repetition and a champion mindset.',
      n_coaches_title:'Champion coaches', n_coaches_cnt:'Champions who train champions',
      coach1_r:'Technical direction', coach1_c:'10 championships as a coach across the national and international circuit.', coach1_p:'Head Coach',
      coach2_r:'Public Forum', coach2_c:'International finalist. Specialist in argumentation and high-impact cases.', coach2_p:'Strategy',
      coach3_r:'Oratory', coach3_c:'Competitive oratory coach. Voice, presence and stage control.', coach3_p:'Presence',
      n_values_title:'What is non-negotiable.',
      v1_t:'Discipline', v1_d:'Preparation is not luck. It is deliberate repetition, week after week.',
      v2_t:'Clarity', v2_d:'Think clearly to speak clearly. Structure before ornament.',
      v3_t:'Champion mindset', v3_d:'Compete, lose, adjust and return. Until you own the room.',
      marquee:["Harvard JV '25 — Champions","Florida Blue Key '24","Tournament of Champions","New Horizons — Champions","St. Michael's — Co-Champions","Dominican National Circuit — Champions","Caribbean Debate Series — Gold","NSDA"]
    }
  };

  let lang = 'es';
  function applyLang(l) {
    lang = l; const dict = I18N[l];
    document.documentElement.lang = l;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.textContent = dict[k];
    });
    // method anchor (mixed markup)
    const anchor = document.querySelector('.method-anchor p');
    if (anchor) anchor.innerHTML = dict.method_anchor_pre + '<em>' + dict.method_anchor_em + '</em>';
    const skip = document.getElementById('skip'); if (skip) skip.textContent = dict.skip;
    document.querySelectorAll('.lang button').forEach((b) =>
      b.classList.toggle('on', b.dataset.lang === l));
    buildMarquee(dict.marquee);
    try { localStorage.setItem('otr_lang', l); } catch (e) {}
  }
  document.querySelectorAll('.lang button').forEach((b) =>
    b.addEventListener('click', () => applyLang(b.dataset.lang)));
  let savedLang = 'es';
  try { savedLang = localStorage.getItem('otr_lang') || 'es'; } catch (e) {}
  applyLang(savedLang === 'en' ? 'en' : 'es');

  /* ---------------- slide router ---------------- */
  const routes = {
    home: document.getElementById('route-home'),
    resultados: document.getElementById('route-resultados'),
    nosotros: document.getElementById('route-nosotros'),
  };
  let current = 'home';
  let animating = false;
  const DURATION = 620;

  // nav shrink reacts to the ACTIVE route's own scroll (routes scroll internally)
  const nav = document.getElementById('nav');
  function updateNav() {
    const el = routes[current];
    nav.classList.toggle('scrolled', (el ? el.scrollTop : 0) > 40);
  }
  Object.values(routes).forEach((el) => { if (el) el.addEventListener('scroll', updateNav, { passive: true }); });

  function forceReveal(routeEl) {
    routeEl.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    routeEl.querySelectorAll('.step').forEach((el) => el.classList.add('in'));
  }

  function setInstant(el, pct) {
    el.style.transition = 'none';
    el.style.transform = 'translateX(' + pct + '%)';
    void el.offsetWidth; // reflow so the next change animates
    el.style.transition = '';
  }

  function navigate(to, push) {
    if (!routes[to] || to === current || animating) return;
    const dir = to === 'home' ? 'back' : 'forward';
    const fromEl = routes[current];
    const toEl = routes[to];
    animating = true;

    toEl.classList.add('active');
    toEl.setAttribute('aria-hidden', 'false');
    if (dir === 'forward') toEl.scrollTop = 0; // sub-pages enter at top
    revealPass(toEl);

    const enterFrom = dir === 'forward' ? 100 : -100; // forward: new page enters from the right
    const exitTo = dir === 'forward' ? -100 : 100;     // forward: current page exits to the left
    setInstant(toEl, enterFrom);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      toEl.style.transform = 'translateX(0%)';
      fromEl.style.transform = 'translateX(' + exitTo + '%)';
    }));

    const finish = () => {
      fromEl.classList.remove('active');
      fromEl.setAttribute('aria-hidden', 'true');
      current = to;
      document.body.dataset.route = to;
      animating = false;
      updateNav();
      revealPass(toEl);
    };
    setTimeout(finish, DURATION + 30);

    if (push) {
      try { history.pushState({ route: to }, '', to === 'home' ? '#' : '#' + to); } catch (e) {}
    }
  }

  function scrollToAnchor(id) {
    const el = routes[current];
    const target = el && el.querySelector('#' + id);
    if (target) el.scrollTo({ top: target.offsetTop - 72, behavior: 'smooth' });
  }

  // nav / link handlers
  document.addEventListener('click', (e) => {
    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.preventDefault();
      const to = navEl.dataset.nav;
      const anchor = navEl.dataset.anchor;
      if (to === current) { if (anchor) scrollToAnchor(anchor); return; }
      navigate(to, true);
      if (anchor) setTimeout(() => scrollToAnchor(anchor), DURATION + 60);
      return;
    }
    const back = e.target.closest('[data-back]');
    if (back) { e.preventDefault(); navigate('home', true); return; }
    // sub-page CTA buttons -> home + booking section
    const ctaBtn = e.target.closest('.cta-band .btn');
    if (ctaBtn) {
      e.preventDefault();
      if (current !== 'home') { navigate('home', true); setTimeout(() => scrollToAnchor('cta'), DURATION + 60); }
      else scrollToAnchor('cta');
      return;
    }
    // generic in-page anchors within the current route
    const a = e.target.closest('a[href^="#"]');
    if (a && !a.hasAttribute('data-nav')) {
      const id = a.getAttribute('href').slice(1);
      if (id && routes[current] && routes[current].querySelector('#' + id)) {
        e.preventDefault();
        scrollToAnchor(id);
      }
    }
  });

  // browser back / forward
  window.addEventListener('popstate', (e) => {
    const to = (e.state && e.state.route) ||
      (location.hash && routes[location.hash.slice(1)] ? location.hash.slice(1) : 'home');
    if (to !== current) navigate(to, false);
  });

  // initialise
  document.body.dataset.route = 'home';
  try { history.replaceState({ route: 'home' }, '', location.hash && routes[location.hash.slice(1)] ? location.hash : '#'); } catch (e) {}
  updateNav();

  // safety net + deterministic reveal: IntersectionObserver is unreliable inside a
  // fixed/overflow scroll container, so drive reveals from the route's own scroll.
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const pre = el.dataset.pre || '';
    const suf = el.dataset.suf || '';
    const dur = 1500; const t0 = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * e);
      el.textContent = pre + val;
      if (p < 1) requestAnimationFrame(tick);
      else el.innerHTML = pre + val + (suf ? '<span class="suf">' + suf + '</span>' : '');
    }
    requestAnimationFrame(tick);
  }

  function revealPass(routeEl) {
    if (!routeEl) return;
    const vh = routeEl.clientHeight || window.innerHeight;
    routeEl.querySelectorAll('.reveal:not(.in),.step:not(.in)').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > -40) el.classList.add('in');
    });
    routeEl.querySelectorAll('[data-count]').forEach((el) => {
      if (el.dataset.counted) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) { el.dataset.counted = '1'; animateCount(el); }
    });
  }

  Object.values(routes).forEach((el) => {
    if (el) el.addEventListener('scroll', () => revealPass(el), { passive: true });
  });
  window.addEventListener('resize', () => revealPass(routes[current]));

  // reveal whatever is in view on first paint (run a few times as layout/fonts settle)
  function initialReveal() { revealPass(routes.home); }
  requestAnimationFrame(() => requestAnimationFrame(initialReveal));
  window.addEventListener('load', initialReveal);
  setTimeout(initialReveal, 150);
  setTimeout(initialReveal, 600);

  // ensure the H1 is revealed once the intro is no longer covering it
  setTimeout(function ensureH1() {
    var ov = document.getElementById('intro');
    if (!ov || ov.classList.contains('gone') || getComputedStyle(ov).display === 'none') revealH1();
    else setTimeout(ensureH1, 120);
  }, 60);

  /* ---------------- FAQ accordion ---------------- */
  document.addEventListener('click', (e) => {
    const q = e.target.closest('.faq-q');
    if (!q) return;
    const item = q.closest('.faq-item');
    const a = item.querySelector('.faq-a');
    const open = item.classList.toggle('open');
    a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
  });

  /* ---------------- authority marquee (localized, rebuildable) ---------------- */
  function buildMarquee(items) {
    const track = document.getElementById('mqtrack');
    if (!track || !items) return;
    const html = items.map((t) =>
      `<span class="mq-item"><svg class="trophy" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 4h10v3a5 5 0 0 1-10 0V4z" stroke="currentColor" stroke-width="1.6"/><path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 13v3h6v-3M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>${t}</span><span class="mq-dot"></span>`
    ).join('');
    track.innerHTML = html + html; // seamless loop (animation translates -50%)
  }

  /* ---------------- before/after voicewaves ---------------- */
  function buildWave(el, type) {
    const N = 26;
    for (let i = 0; i < N; i++) {
      const bar = document.createElement('i');
      let h, range, dur;
      if (type === 'before') {
        // a low, flat mumble — short bars, barely moving
        h = 6 + Math.abs(Math.sin(i * 0.8)) * 7 + Math.random() * 3;        // ~6–16%
        range = 0.10;                                                       // tiny wobble
        dur = 1700 + Math.random() * 1100;                                  // slow
      } else {
        // a confident voice — tall, dynamic, speech-like
        const env = Math.sin((i / (N - 1)) * Math.PI);                      // centre arch
        h = 24 + env * 46 + Math.abs(Math.sin(i * 1.27)) * 20 + Math.random() * 12; // ~24–95%
        range = 0.5;                                                        // big movement
        dur = 620 + Math.random() * 680;                                    // lively
      }
      bar.style.height = Math.min(96, h) + '%';
      if (!reduce) {
        bar.style.setProperty('--lo', (1 - range).toFixed(2));
        bar.style.setProperty('--hi', (1 + range * 0.45).toFixed(2));
        bar.style.animation = `vw ${dur.toFixed(0)}ms ${(i * 0.045).toFixed(2)}s ease-in-out infinite alternate`;
      }
      el.appendChild(bar);
    }
  }
  document.querySelectorAll('[data-wave]').forEach((el) => buildWave(el, el.dataset.wave));
  // per-bar scale animation (amount controlled by --lo / --hi on each bar)
  const styleEl = document.createElement('style');
  styleEl.textContent = '@keyframes vw{from{transform:scaleY(var(--lo,.8))}to{transform:scaleY(var(--hi,1.1))}}';
  document.head.appendChild(styleEl);

  /* ---------------- hero H1 line reveal ---------------- */
  function revealH1() {
    document.querySelectorAll('#h1 .word > span').forEach((s, i) => {
      s.style.transition = 'transform 1s cubic-bezier(.2,.8,.2,1)';
      s.style.transitionDelay = (i * 110) + 'ms';
      requestAnimationFrame(() => { s.style.transform = 'translateY(0)'; });
    });
  }

  /* ---------------- clarity beam (desktop) ---------------- */
  const beam = document.getElementById('beam');
  const hero = document.getElementById('hero');
  if (beam && hero && window.matchMedia('(pointer:fine)').matches && !reduce) {
    hero.addEventListener('pointerenter', () => { beam.style.opacity = '1'; });
    hero.addEventListener('pointerleave', () => { beam.style.opacity = '0'; window.__orbPulse = 0; });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      beam.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      beam.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      window.__orbPulse = 0.35; // gentle reaction to pointer
    });
  }

  /* ---------------- OTR soundwave (wow) ---------------- */
  const wave = document.getElementById('otrwave');
  if (wave) drawOTRWave(wave);
  function drawOTRWave(cv) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    // sample the word "OTR" into an amplitude profile across X
    const sample = document.createElement('canvas');
    sample.width = W; sample.height = H;
    const sx = sample.getContext('2d');
    sx.fillStyle = '#fff';
    // stretch the word to fill ~78% of the canvas width so OTR reads clearly
    sx.save();
    sx.translate(W / 2, H / 2 + 6);
    sx.scale(1.9, 1.0);
    sx.font = '900 190px "Archivo Expanded", sans-serif';
    sx.textAlign = 'center'; sx.textBaseline = 'middle';
    sx.fillText('OTR', 0, 0);
    sx.restore();
    const data = sx.getImageData(0, 0, W, H).data;
    const cols = 240;
    const amp = new Array(cols).fill(0);
    for (let c = 0; c < cols; c++) {
      const x = Math.floor((c / cols) * W);
      let top = -1, bot = -1;
      for (let y = 0; y < H; y++) {
        const a = data[(y * W + x) * 4 + 3];
        if (a > 60) { if (top < 0) top = y; bot = y; }
      }
      amp[c] = top < 0 ? 0 : (bot - top) / H; // 0..~0.8
    }
    // soften the blocky letter edges so the wave reads as a natural waveform (rounded ramps)
    for (let pass = 0; pass < 2; pass++) {
      const out = amp.slice();
      for (let i = 0; i < cols; i++) {
        const l = amp[Math.max(0, i - 1)], m = amp[i], r = amp[Math.min(cols - 1, i + 1)];
        out[i] = (l + 2 * m + r) / 4;
      }
      for (let i = 0; i < cols; i++) amp[i] = out[i];
    }

    let t = 0;
    function loop() {
      ctx.clearRect(0, 0, W, H);
      const mid = H / 2;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, '#2E8BD0'); grad.addColorStop(0.5, '#7FC8F2'); grad.addColorStop(1, '#2E8BD0');
      ctx.strokeStyle = grad; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      const slow = t * 0.016;
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1)) * W;
        const p = c / (cols - 1);                        // 0..1 across the line
        const dist = Math.abs(p - 0.5) * 2;              // 0 centre -> 1 ends
        const fade = Math.pow(1 - dist, 0.85);           // gradual taper outward
        const endFade = Math.min(1, Math.min(c, cols - 1 - c) / 10); // dissolve the final bars
        // soft, slow travelling motion
        const breathe = reduce ? 0 : Math.sin(slow * 2 + c * 0.14) * 0.1;
        const flow = reduce ? 0 : Math.sin(slow * 1.25 + c * 0.32) * 0.018;
        // a living baseline that itself fades toward the edges (no flat dead line)
        const base = (0.028 + (reduce ? 0 : 0.012 * Math.sin(slow * 1.5 + c * 0.45))) * fade;
        let a = Math.max(base, amp[c] * (0.95 + breathe)) + flow * fade;
        // fine organic ripple so letter crests undulate instead of reading as flat blocks
        const texture = 1 + 0.05 * Math.sin(c * 1.9) + 0.03 * Math.sin(c * 0.7 + 2.0);
        const h = a * (H * 0.70) * (0.5 + 0.5 * fade) * texture; // taper toward the ends + ripple
        ctx.globalAlpha = (0.22 + 0.78 * fade) * endFade; // opacity fades along the line
        ctx.beginPath();
        ctx.moveTo(x, mid - h);
        ctx.lineTo(x, mid + h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      t += 1;
      if (!reduce) requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------------- INTRO (navy particles -> crest -> orb) ---------------- */
  const intro = document.getElementById('intro');
  const introCanvas = document.getElementById('intro-canvas');
  const crest = document.querySelector('.intro-crest');
  const skipBtn = document.getElementById('skip');
  const seen = sessionStorage.getItem('otr_intro_seen');

  function endIntro() {
    if (!intro || intro.classList.contains('gone')) return;
    intro.classList.add('gone');
    sessionStorage.setItem('otr_intro_seen', '1');
    setTimeout(revealH1, 200);
  }
  if (skipBtn) skipBtn.addEventListener('click', endIntro);

  if (reduce || seen || !introCanvas) {
    if (intro) { intro.style.display = 'none'; }
    revealH1();
  } else {
    runIntro();
  }

  function runIntro() {
    const ctx = introCanvas.getContext('2d');
    let DPR = Math.min(window.devicePixelRatio || 1, 2);
    function size() { introCanvas.width = innerWidth * DPR; introCanvas.height = innerHeight * DPR; }
    size();
    const cx = () => introCanvas.width / 2, cy = () => introCanvas.height / 2;
    const N = 220;
    const parts = [];
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = (Math.max(innerWidth, innerHeight) * DPR) * (0.5 + Math.random() * 0.6);
      parts.push({
        ang, rad,
        tx: cx() + Math.cos(ang) * (40 + Math.random() * 70) * DPR,
        ty: cy() + Math.sin(ang) * (50 + Math.random() * 80) * DPR,
        x: cx() + Math.cos(ang) * rad, y: cy() + Math.sin(ang) * rad,
        s: (1 + Math.random() * 2.2) * DPR
      });
    }
    const t0 = performance.now();
    const DUR = 1500;
    function frame(now) {
      const p = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 3);
      ctx.clearRect(0, 0, introCanvas.width, introCanvas.height);
      ctx.fillStyle = '#0C2340';
      parts.forEach((pt) => {
        const x = pt.x + (pt.tx - pt.x) * e;
        const y = pt.y + (pt.ty - pt.y) * e;
        ctx.globalAlpha = 0.25 + 0.6 * e;
        ctx.beginPath(); ctx.arc(x, y, pt.s * (1 - 0.4 * e), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (p < 1 && !intro.classList.contains('gone')) requestAnimationFrame(frame);
      else {
        // crest in, then dissolve to orb
        if (crest) {
          crest.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.2,.8,.2,1)';
          crest.style.transform = 'scale(1)';
          crest.style.opacity = '1';
        }
        ctx.clearRect(0, 0, introCanvas.width, introCanvas.height);
        setTimeout(endIntro, 760);
      }
    }
    requestAnimationFrame(frame);
    // hard cap so users never wait
    setTimeout(endIntro, 2500);
  }
})();

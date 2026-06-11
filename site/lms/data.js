/* OTR LMS · mock data (contenido placeholder realista — reemplazable) */
const DB = {
  me: { name:'Analía Reyes', email:'analia.reyes@otr.do', initials:'AR', level:'Varsity', streak:12, role:'student' },
  teacher: { name:'Coach Saúl Méndez', email:'saul@otr.do', initials:'SM', role:'teacher' },

  levels: [
    { id:'novato',  name:'Novato',  range:'0 – 999 XP',      color:'var(--lvl-novato)' },
    { id:'jv',      name:'JV',       range:'1.000 – 2.499 XP', color:'var(--lvl-jv)' },
    { id:'varsity', name:'Varsity',  range:'2.500 – 4.999 XP', color:'var(--lvl-varsity)' },
    { id:'elite',   name:'Elite',    range:'5.000+ XP',        color:'var(--lvl-elite)' },
  ],
  xp: 3120, xpNext: 5000, xpLevelStart: 2500,

  courses: [
    { id:'pf',  code:'PF-101', name:'Public Forum I', coach:'Coach Saúl Méndez', color:'#2E8BD0', progress:72, next:'Refutación cruzada', students:24, lessons:18, due:2 },
    { id:'ld',  code:'LD-201', name:'Lincoln–Douglas', coach:'Coach María Tavárez', color:'#0C2340', progress:45, next:'Marcos de valor', students:19, lessons:16, due:1 },
    { id:'ora', code:'OR-110', name:'Oratoria & Presencia', coach:'Coach Agustín Polanco', color:'#4FA9E8', progress:88, next:'Cierre persuasivo', students:31, lessons:12, due:0 },
    { id:'par', code:'PA-150', name:'Parliamentary', coach:'Coach Saúl Méndez', color:'#7FC8F2', progress:30, next:'POIs y estrategia', students:22, lessons:20, due:3 },
    { id:'ws',  code:'WS-300', name:'World Schools', coach:'Coach María Tavárez', color:'#2E8BD0', progress:12, next:'Estilo y dinámica', students:16, lessons:14, due:1 },
    { id:'sum', code:'SC-26',  name:'Summer Camp 2026', coach:'Equipo OTR', color:'#0C2340', progress:0, next:'Bienvenida', students:48, lessons:24, due:0 },
  ],

  courseModules: [
    { t:'Unidad 1 · Fundamentos', done:true, items:[
      { t:'Bienvenida y diagnóstico', type:'video', done:true, dur:'8 min' },
      { t:'Anatomía de un caso', type:'lesson', done:true, dur:'15 min' },
      { t:'Quiz: estructura básica', type:'quiz', done:true, grade:'92%' },
    ]},
    { t:'Unidad 2 · Argumentación', done:false, items:[
      { t:'Claim · Warrant · Impact', type:'lesson', done:true, dur:'18 min' },
      { t:'Construye tu primer contention', type:'assign', done:false, due:'Mañana 23:59' },
      { t:'Grabación: discurso de 2 min', type:'mic', done:false, due:'Vie 23:59' },
    ]},
    { t:'Unidad 3 · Refutación', done:false, locked:true, items:[
      { t:'Refutación cruzada', type:'lesson', locked:true },
      { t:'Simulacro con jueces', type:'video', locked:true },
      { t:'Examen de unidad', type:'quiz', locked:true },
    ]},
  ],

  students: [
    { n:'Saúl Castillo',    i:'SC', lvl:'Elite',   xp:5240, grade:96, att:98, eng:'Alto',  trend:'up',   risk:false, last:'hace 2h' },
    { n:'Agustín Polanco',  i:'AP', lvl:'Varsity', xp:4120, grade:91, att:95, eng:'Alto',  trend:'up',   risk:false, last:'hace 5h' },
    { n:'María Tavárez',    i:'MT', lvl:'Varsity', xp:3870, grade:89, att:90, eng:'Medio', trend:'flat', risk:false, last:'ayer' },
    { n:'Analía Reyes',     i:'AR', lvl:'Varsity', xp:3120, grade:88, att:92, eng:'Alto',  trend:'up',   risk:false, last:'hace 2h' },
    { n:'Diego Fermín',     i:'DF', lvl:'JV',      xp:2210, grade:74, att:78, eng:'Bajo',  trend:'down', risk:true,  last:'hace 4d' },
    { n:'Camila Núñez',     i:'CN', lvl:'JV',      xp:1980, grade:82, att:88, eng:'Medio', trend:'up',   risk:false, last:'hace 1d' },
    { n:'José Batista',     i:'JB', lvl:'JV',      xp:1640, grade:69, att:65, eng:'Bajo',  trend:'down', risk:true,  last:'hace 6d' },
    { n:'Valentina Cruz',   i:'VC', lvl:'Novato',  xp:820,  grade:85, att:94, eng:'Alto',  trend:'up',   risk:false, last:'hace 3h' },
  ],

  gradebook: {
    cols:['Diagnóstico','Contention #1','Quiz U1','Grabación 2min','Simulacro','Examen U2'],
    rows:[
      { n:'Saúl Castillo',   i:'SC', g:['95','98','92','94','97','—'] },
      { n:'Agustín Polanco', i:'AP', g:['88','91','90','89','93','—'] },
      { n:'Analía Reyes',    i:'AR', g:['90','85','92','88','—','—'] },
      { n:'Diego Fermín',    i:'DF', g:['72','—','68','—','—','—'] },
      { n:'Camila Núñez',    i:'CN', g:['84','80','86','82','—','—'] },
      { n:'José Batista',    i:'JB', g:['70','—','65','—','—','—'] },
    ],
  },

  badges: [
    { n:'Primer discurso', d:'Completaste tu primera grabación', got:true, ic:'mic', tone:'sky' },
    { n:'Racha de 7 días', d:'7 días seguidos entrenando', got:true, ic:'flame', tone:'sky' },
    { n:'Refutador', d:'Ganaste 5 rondas de refutación', got:true, ic:'target', tone:'navy' },
    { n:'Semifinalista', d:'Llegaste a semifinal en un torneo', got:true, ic:'medal', tone:'navy' },
    { n:'Voz de oro', d:'95+ en 3 grabaciones', got:false, ic:'trophy', tone:'lock' },
    { n:'Campeón', d:'Gana un campeonato del circuito', got:false, ic:'award', tone:'lock' },
  ],

  events: [
    { t:'Simulacro con jueces', c:'Public Forum I', when:'Hoy · 4:00 PM', tone:'sky' },
    { t:'Entrega: Contention #1', c:'Public Forum I', when:'Mañana · 11:59 PM', tone:'warn' },
    { t:'Torneo interno OTR', c:'Todos los cursos', when:'Sáb · 9:00 AM', tone:'navy' },
  ],

  activity: [
    { who:'Coach Saúl', a:'calificó tu grabación', t:'94%', when:'hace 1h' },
    { who:'Tú', a:'completaste', t:'Quiz: estructura básica', when:'hace 3h' },
    { who:'Camila N.', a:'comentó en el foro', t:'Refutación cruzada', when:'hace 5h' },
  ],

  notifications: [
    { ic:'chart', tone:'ok',   t:'Tu grabación fue calificada', d:'Coach Saúl · 94% — “Excelente claim”', when:'hace 1h', unread:true },
    { ic:'clock', tone:'warn', t:'Entrega vence mañana', d:'Contention #1 · Public Forum I', when:'hace 3h', unread:true },
    { ic:'msg',   tone:'sky',  t:'Camila te respondió en el foro', d:'Hilo: Refutación cruzada', when:'hace 5h', unread:true },
    { ic:'medal', tone:'navy', t:'¡Nueva insignia desbloqueada!', d:'Semifinalista · +250 XP', when:'ayer', unread:false },
    { ic:'calendar', tone:'sky', t:'Simulacro programado', d:'Hoy 4:00 PM con jueces', when:'ayer', unread:false },
  ],

  forum: [
    { id:1, title:'¿Cómo refutar un argumento de impacto sin caer en falacias?', author:'Camila Núñez', ini:'CN', tag:'Refutación', replies:8, views:42, pinned:true, last:'hace 2h', excerpt:'Estuve en el simulacro y me costó atacar el impacto sin que el juez lo viera como ataque personal. ¿Tips?' },
    { id:2, title:'Plantilla de Contention que uso para PF (compartida)', author:'Saúl Castillo', ini:'SC', tag:'Recursos', replies:14, views:96, pinned:true, last:'hace 6h', excerpt:'Les dejo mi estructura Claim · Warrant · Impact en una página. Me sirvió para semifinal.' },
    { id:3, title:'Dudas sobre el crossfire — ¿quién pregunta primero?', author:'Diego Fermín', ini:'DF', tag:'Reglas', replies:3, views:21, pinned:false, last:'hace 1d', excerpt:'Nunca me queda claro el orden en Public Forum. ¿Alguien me lo explica simple?' },
    { id:4, title:'Mi evidencia para el tema de este mes', author:'Analía Reyes', ini:'AR', tag:'Evidencia', replies:5, views:33, pinned:false, last:'hace 2d', excerpt:'Encontré un estudio de 2025 muy fuerte. ¿Lo revisamos juntos antes del torneo?' },
  ],
  forumThread: {
    title:'¿Cómo refutar un argumento de impacto sin caer en falacias?',
    tag:'Refutación',
    posts:[
      { author:'Camila Núñez', ini:'CN', role:'Estudiante', when:'hace 2h', op:true, body:'Estuve en el simulacro y me costó atacar el impacto del rival sin que el juez lo viera como ataque personal. ¿Cómo lo separan ustedes?' },
      { author:'Coach Saúl Méndez', ini:'SM', role:'Coach', when:'hace 1h', body:'Buena pregunta. Ataca la <b>lógica</b>, no a la persona: cuestiona la probabilidad y la magnitud del impacto. “Aunque eso fuera cierto, su probabilidad es baja porque…”. Eso es refutar, no descalificar.' },
      { author:'Saúl Castillo', ini:'SC', role:'Estudiante', when:'hace 40 min', body:'A mí me funciona el “turn”: tomo su impacto y muestro que en realidad juega a mi favor. El juez lo ama.' },
    ],
  },
  messages: [
    { ini:'SM', name:'Coach Saúl Méndez', last:'Te dejé feedback en la grabación 👏', when:'hace 1h', unread:2, online:true, navy:true },
    { ini:'CN', name:'Camila Núñez', last:'¿Practicamos crossfire mañana?', when:'hace 3h', unread:0, online:true },
    { ini:'OTR', name:'Equipo OTR (anuncios)', last:'Recordatorio: torneo interno el sábado', when:'ayer', unread:0, online:false, navy:true },
    { ini:'AP', name:'Agustín Polanco', last:'Te paso mi evidencia', when:'ayer', unread:0, online:false },
  ],
  chat:[
    { me:false, body:'¡Hola Analía! Vi tu grabación de 2 minutos.', when:'10:02' },
    { me:false, body:'Tu claim quedó clarísimo en los primeros 10 segundos 👏', when:'10:02' },
    { me:true,  body:'¡Gracias coach! Sentí que el cierre me quedó flojo.', when:'10:05' },
    { me:false, body:'Un poco. Cierra siempre con el impacto, no con un resumen. Vuelve a grabar el último tramo y me lo mandas.', when:'10:06' },
    { me:true,  body:'Hecho. Lo subo hoy mismo 💪', when:'10:08' },
  ],

  /* ---------------- HUB ---------------- */
  teachers: [
    { id:'saul', name:'Coach Saúl Méndez', ini:'SM', tagline:'Head Coach · Public Forum & Parliamentary',
      rating:4.9, reviews:32, students:120, wins:'Harvard JV · New Horizons · Blue Key',
      specialties:['Public Forum','Parliamentary','Estrategia de casos'],
      how:['Diagnóstico primero: medimos antes de entrenar','Repetición deliberada con drills bajo presión','Feedback quirúrgico después de cada ronda'],
      bio:'Competidor y entrenador del circuito nacional e internacional. Lidera el sistema técnico de OTR: el mismo que llevó a equipos novatos a romper en Blue Key y ganar Harvard JV.',
      programIds:['pf','par','camp'],
      reviewList:[
        { who:'Isabella R.', ini:'IR', stars:5, when:'hace 2 sem', text:'Con Saúl pasamos de nunca romper a ganar 14 rondas seguidas. Exigente pero te cambia la carrera.' },
        { who:'Padre de Aaron', ini:'PA', stars:5, when:'hace 1 mes', text:'El tracking semanal es real. Sabía exactamente cómo iba mi hijo cada viernes.' },
        { who:'Diego F.', ini:'DF', stars:4, when:'hace 2 meses', text:'Las simulaciones con jueces son durísimas, pero llegas al torneo sin miedo.' },
      ]},
    { id:'maria', name:'Coach María Tavárez', ini:'MT', tagline:'Lincoln–Douglas & World Schools',
      rating:4.8, reviews:21, students:85, wins:'TOC Gold Varsity · St. Michael\u2019s',
      specialties:['Lincoln–Douglas','World Schools','Marcos de valor'],
      how:['Filosofía aplicada: marcos de valor que los jueces entienden','Casos construidos contigo, no plantillas recicladas','Sesiones 1-a-1 de refutación cada semana'],
      bio:'Semifinalista de Tournament of Champions. Especialista en debate de valores y estilo World Schools — la coach detrás de las finales back-to-back del equipo Varsity femenino.',
      programIds:['ld','ws'],
      reviewList:[
        { who:'Analia R.', ini:'AR', stars:5, when:'hace 1 sem', text:'María me enseñó a pensar, no a memorizar. Mi primera final fue con su marco de valor.' },
        { who:'Silvana M.', ini:'SV', stars:5, when:'hace 3 sem', text:'Back-to-back finales. No hay más que decir.' },
        { who:'Camila N.', ini:'CN', stars:4, when:'hace 1 mes', text:'Sus sesiones 1-a-1 valen oro. Quisiera más horarios disponibles.' },
      ]},
    { id:'agustin', name:'Coach Agustín Polanco', ini:'AP', tagline:'Oratoria, voz y presencia escénica',
      rating:5.0, reviews:18, students:64, wins:'Novice Speaking Awards · 130+ en seminarios',
      specialties:['Oratoria','Presencia escénica','Control de voz'],
      how:['Drills progresivos de confianza: del espejo a 100 personas','Grabamos todo: tu voz es tu métrica','Trabajo de respiración, pausa y énfasis'],
      bio:'Coach de oratoria competitiva y conferencista. Dirige los seminarios públicos de OTR ("Habla frente a 100 personas como un experto") y el programa de voz.',
      programIds:['ora','camp'],
      reviewList:[
        { who:'Sigmund T.', ini:'ST', stars:5, when:'hace 2 sem', text:'Gané mi Novice Speaking Award después de un mes de drills de voz con Agustín.' },
        { who:'Valentina C.', ini:'VC', stars:5, when:'hace 1 mes', text:'Pasé de temblar frente a 5 personas a abrir el seminario frente a 130.' },
      ]},
  ],

  programs: [
    { id:'pf',   name:'Public Forum I', teacher:'saul', type:'Grupal', cadence:'2 sesiones/sem', level:'Novato–JV', seats:4, desc:'El formato estrella del circuito: casos, crossfire y estrategia en equipo.', tag:'Más popular' },
    { id:'ld',   name:'Lincoln–Douglas', teacher:'maria', type:'Grupal', cadence:'2 sesiones/sem', level:'JV–Varsity', seats:6, desc:'Debate de valores 1 vs 1. Filosofía aplicada y marcos que ganan rondas.' },
    { id:'ora',  name:'Oratoria & Presencia', teacher:'agustin', type:'1-a-1 o grupal', cadence:'1–2 sesiones/sem', level:'Todos', seats:8, desc:'Voz, pausa, escena. Del miedo escénico a abrir un seminario frente a 100.' },
    { id:'par',  name:'Parliamentary', teacher:'saul', type:'Grupal', cadence:'2 sesiones/sem', level:'JV–Varsity', seats:5, desc:'Improvisación estructurada, POIs y estrategia de gobierno/oposición.' },
    { id:'ws',   name:'World Schools', teacher:'maria', type:'Grupal', cadence:'1 sesión/sem', level:'Varsity', seats:3, desc:'El formato internacional por excelencia: estilo, contenido y dinámica.' },
    { id:'camp', name:'Summer Camp 2026', teacher:'saul', type:'Intensivo', cadence:'2 semanas · jul', level:'Todos', seats:12, desc:'Inmersión total: 10 días de entrenamiento, simulacros y torneo interno.', tag:'Inscripción abierta' },
  ],

  materials: [
    { t:'Plantilla de Contention (CWI)', type:'Plantilla', fmt:'PDF', meta:'1 página · ES/EN', hot:true },
    { t:'Guía de Refutación: del "turn" al impacto', type:'Guía', fmt:'PDF', meta:'12 páginas' },
    { t:'Banco de evidencia · Junio 2026', type:'Evidencia', fmt:'Drive', meta:'Actualizado semanal', hot:true },
    { t:'Final Harvard JV \u201925 · ronda completa', type:'Video', fmt:'Video', meta:'48 min · con notas del juez' },
    { t:'Drills de voz y respiración', type:'Guía', fmt:'Audio', meta:'8 ejercicios · 22 min' },
    { t:'Formato de flow para Public Forum', type:'Plantilla', fmt:'PDF', meta:'Imprimible A4' },
    { t:'Rúbrica oficial de jueces OTR', type:'Guía', fmt:'PDF', meta:'La que usamos en simulacros' },
    { t:'Reglas Public Forum · NSDA 2026', type:'Guía', fmt:'PDF', meta:'Resumen en español' },
  ],

  hubFeed: [
    { ic:'trophy', tone:'navy', t:'Torneo interno OTR — sábado 9:00 AM', d:'Todos los niveles. Los ganadores representan a OTR en el regional.', when:'Este sábado', cta:'Inscribirme' },
    { ic:'mic', tone:'sky', t:'Seminario: "Habla frente a 100 personas como un experto"', d:'Con Coach Agustín · 130+ asistentes en la última edición.', when:'Jue 7:00 PM', cta:'Reservar lugar' },
    { ic:'medal', tone:'ok', t:'Isabella & Aaron — Campeones de New Horizons 🏆', d:'14 rondas consecutivas ganadas. Mejor récord Novice dominicano en Blue Key.', when:'hace 3 días' },
    { ic:'book', tone:'sky', t:'Nuevo en la biblioteca: Banco de evidencia de junio', d:'Actualizado con los temas del próximo regional.', when:'hace 1 sem' },
  ],
};

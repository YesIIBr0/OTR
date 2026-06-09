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
};

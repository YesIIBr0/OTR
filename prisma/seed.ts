// OTR LMS · seed — carga los datos de OTR en la base de datos
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../app/lib/auth-crypto";
const db = new PrismaClient();

async function main() {
  // limpiar (hijos primero)
  await db.chatMessage.deleteMany();
  await db.conversation.deleteMany();
  await db.forumPost.deleteMany();
  await db.forumThread.deleteMany();
  await db.activityItem.deleteMany();
  await db.eventItem.deleteMany();
  await db.notification.deleteMany();
  await db.badge.deleteMany();
  await db.competency.deleteMany();
  await db.gradeCell.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
  await db.enrollment.deleteMany();
  await db.course.deleteMany();
  await db.level.deleteMany();
  await db.user.deleteMany();

  // --- Usuarios ---
  await db.user.createMany({ data: [
    // coaches
    { id:"u-saul", name:"Coach Saúl Méndez", email:"saul@otr.do", role:"TEACHER", initials:"SM", level:"Elite", xp:0, streak:0 },
    { id:"u-maria-c", name:"Coach María Tavárez", email:"coach.maria@otr.do", role:"TEACHER", initials:"MT", level:"Elite", xp:0, streak:0 },
    { id:"u-agustin-c", name:"Coach Agustín Polanco", email:"coach.agustin@otr.do", role:"TEACHER", initials:"AP", level:"Elite", xp:0, streak:0 },
    // estudiantes (roster Public Forum I)
    { id:"u-sc", name:"Saúl Castillo", email:"saul.castillo@otr.do", role:"STUDENT", initials:"SC", level:"Elite", xp:5240, streak:9 },
    { id:"u-ap", name:"Agustín Polanco", email:"agustin.polanco@otr.do", role:"STUDENT", initials:"AP", level:"Varsity", xp:4120, streak:7 },
    { id:"u-mt", name:"María Tavárez", email:"maria.tavarez@otr.do", role:"STUDENT", initials:"MT", level:"Varsity", xp:3870, streak:5 },
    { id:"u-ar", name:"Analía Reyes", email:"analia.reyes@otr.do", role:"STUDENT", initials:"AR", level:"Varsity", xp:3120, streak:12 },
    { id:"u-df", name:"Diego Fermín", email:"diego.fermin@otr.do", role:"STUDENT", initials:"DF", level:"JV", xp:2210, streak:0 },
    { id:"u-cn", name:"Camila Núñez", email:"camila.nunez@otr.do", role:"STUDENT", initials:"CN", level:"JV", xp:1980, streak:3 },
    { id:"u-jb", name:"José Batista", email:"jose.batista@otr.do", role:"STUDENT", initials:"JB", level:"JV", xp:1640, streak:0 },
    { id:"u-vc", name:"Valentina Cruz", email:"valentina.cruz@otr.do", role:"STUDENT", initials:"VC", level:"Novato", xp:820, streak:4 },
  ]});

  // contraseña demo para todos los usuarios sembrados: "otr1234"
  await db.user.updateMany({ data: { passwordHash: hashPassword("otr1234") } });

  // --- Niveles ---
  await db.level.createMany({ data: [
    { name:"Novato",  range:"0 – 999 XP",       color:"var(--lvl-novato)",  startXp:0,    position:0 },
    { name:"JV",      range:"1.000 – 2.499 XP", color:"var(--lvl-jv)",      startXp:1000, position:1 },
    { name:"Varsity", range:"2.500 – 4.999 XP", color:"var(--lvl-varsity)", startXp:2500, position:2 },
    { name:"Elite",   range:"5.000+ XP",        color:"var(--lvl-elite)",   startXp:5000, position:3 },
  ]});

  // --- Competencias (progreso) ---
  await db.competency.createMany({ data: [
    { name:"Argumentación", score:88, position:0 },
    { name:"Refutación", score:74, position:1 },
    { name:"Evidencia", score:82, position:2 },
    { name:"Presencia escénica", score:91, position:3 },
    { name:"Estructura", score:85, position:4 },
    { name:"Manejo del tiempo", score:70, position:5 },
  ]});

  // --- Insignias ---
  await db.badge.createMany({ data: [
    { name:"Primer discurso", description:"Completaste tu primera grabación", got:true, icon:"mic", tone:"sky", position:0 },
    { name:"Racha de 7 días", description:"7 días seguidos entrenando", got:true, icon:"flame", tone:"sky", position:1 },
    { name:"Refutador", description:"Ganaste 5 rondas de refutación", got:true, icon:"target", tone:"navy", position:2 },
    { name:"Semifinalista", description:"Llegaste a semifinal en un torneo", got:true, icon:"medal", tone:"navy", position:3 },
    { name:"Voz de oro", description:"95+ en 3 grabaciones", got:false, icon:"trophy", tone:"lock", position:4 },
    { name:"Campeón", description:"Gana un campeonato del circuito", got:false, icon:"award", tone:"lock", position:5 },
  ]});

  // --- Notificaciones ---
  await db.notification.createMany({ data: [
    { icon:"chart", tone:"ok", title:"Tu grabación fue calificada", detail:"Coach Saúl · 94% — “Excelente claim”", whenLabel:"hace 1h", unread:true, position:0 },
    { icon:"clock", tone:"warn", title:"Entrega vence mañana", detail:"Contention #1 · Public Forum I", whenLabel:"hace 3h", unread:true, position:1 },
    { icon:"msg", tone:"sky", title:"Camila te respondió en el foro", detail:"Hilo: Refutación cruzada", whenLabel:"hace 5h", unread:true, position:2 },
    { icon:"medal", tone:"navy", title:"¡Nueva insignia desbloqueada!", detail:"Semifinalista · +250 XP", whenLabel:"ayer", unread:false, position:3 },
    { icon:"calendar", tone:"sky", title:"Simulacro programado", detail:"Hoy 4:00 PM con jueces", whenLabel:"ayer", unread:false, position:4 },
  ]});

  // --- Agenda / actividad ---
  await db.eventItem.createMany({ data: [
    { title:"Simulacro con jueces", course:"Public Forum I", whenLabel:"Hoy · 4:00 PM", tone:"sky", position:0 },
    { title:"Entrega: Contention #1", course:"Public Forum I", whenLabel:"Mañana · 11:59 PM", tone:"warn", position:1 },
    { title:"Torneo interno OTR", course:"Todos los cursos", whenLabel:"Sáb · 9:00 AM", tone:"navy", position:2 },
  ]});
  await db.activityItem.createMany({ data: [
    { who:"Coach Saúl", action:"calificó tu grabación", target:"94%", whenLabel:"hace 1h", position:0 },
    { who:"Tú", action:"completaste", target:"Quiz: estructura básica", whenLabel:"hace 3h", position:1 },
    { who:"Camila N.", action:"comentó en el foro", target:"Refutación cruzada", whenLabel:"hace 5h", position:2 },
  ]});

  // --- Gradebook (matriz) ---
  const cols = ["Diagnóstico","Contention #1","Quiz U1","Grabación 2min","Simulacro","Examen U2"];
  const gbRows = [
    { n:"Saúl Castillo", i:"SC", g:["95","98","92","94","97","—"] },
    { n:"Agustín Polanco", i:"AP", g:["88","91","90","89","93","—"] },
    { n:"Analía Reyes", i:"AR", g:["90","85","92","88","—","—"] },
    { n:"Diego Fermín", i:"DF", g:["72","—","68","—","—","—"] },
    { n:"Camila Núñez", i:"CN", g:["84","80","86","82","—","—"] },
    { n:"José Batista", i:"JB", g:["70","—","65","—","—","—"] },
  ];
  await db.gradeCell.createMany({ data: gbRows.flatMap((r, ri) =>
    r.g.map((v, ci) => ({ studentName:r.n, studentInit:r.i, studentPos:ri, colName:cols[ci], colPos:ci, value:v }))
  )});

  // --- Cursos ---
  await db.course.createMany({ data: [
    { id:"c-pf", code:"PF-101", name:"Public Forum I", coachName:"Coach Saúl Méndez", color:"#2E8BD0", next:"Refutación cruzada", lessonsCount:18, studentsCount:24, position:0, teacherId:"u-saul" },
    { id:"c-ld", code:"LD-201", name:"Lincoln–Douglas", coachName:"Coach María Tavárez", color:"#0C2340", next:"Marcos de valor", lessonsCount:16, studentsCount:19, position:1, teacherId:"u-maria-c" },
    { id:"c-or", code:"OR-110", name:"Oratoria & Presencia", coachName:"Coach Agustín Polanco", color:"#4FA9E8", next:"Cierre persuasivo", lessonsCount:12, studentsCount:31, position:2, teacherId:"u-agustin-c" },
    { id:"c-pa", code:"PA-150", name:"Parliamentary", coachName:"Coach Saúl Méndez", color:"#7FC8F2", next:"POIs y estrategia", lessonsCount:20, studentsCount:22, position:3, teacherId:"u-saul" },
    { id:"c-ws", code:"WS-300", name:"World Schools", coachName:"Coach María Tavárez", color:"#2E8BD0", next:"Estilo y dinámica", lessonsCount:14, studentsCount:16, position:4, teacherId:"u-maria-c" },
    { id:"c-sc", code:"SC-26", name:"Summer Camp 2026", coachName:"Equipo OTR", color:"#0C2340", next:"Bienvenida", lessonsCount:24, studentsCount:48, position:5, teacherId:"u-saul" },
  ]});

  // --- Módulos + lecciones (Public Forum I) ---
  await db.module.createMany({ data: [
    { id:"m-1", courseId:"c-pf", title:"Unidad 1 · Fundamentos", position:0, done:true, locked:false },
    { id:"m-2", courseId:"c-pf", title:"Unidad 2 · Argumentación", position:1, done:false, locked:false },
    { id:"m-3", courseId:"c-pf", title:"Unidad 3 · Refutación", position:2, done:false, locked:true },
  ]});
  await db.lesson.createMany({ data: [
    { moduleId:"m-1", title:"Bienvenida y diagnóstico", type:"video", position:0, done:true, dur:"8 min" },
    { moduleId:"m-1", title:"Anatomía de un caso", type:"lesson", position:1, done:true, dur:"15 min" },
    { moduleId:"m-1", title:"Quiz: estructura básica", type:"quiz", position:2, done:true, grade:"92%" },
    { moduleId:"m-2", title:"Claim · Warrant · Impact", type:"lesson", position:0, done:true, dur:"18 min" },
    { moduleId:"m-2", title:"Construye tu primer contention", type:"assign", position:1, done:false, due:"Mañana 23:59" },
    { moduleId:"m-2", title:"Grabación: discurso de 2 min", type:"mic", position:2, done:false, due:"Vie 23:59" },
    { moduleId:"m-3", title:"Refutación cruzada", type:"lesson", position:0, locked:true },
    { moduleId:"m-3", title:"Simulacro con jueces", type:"video", position:1, locked:true },
    { moduleId:"m-3", title:"Examen de unidad", type:"quiz", position:2, locked:true },
  ]});

  // --- Inscripciones de "me" (Analía) en sus 6 cursos (dashboard) ---
  await db.enrollment.createMany({ data: [
    { userId:"u-ar", courseId:"c-pf", progress:72, due:2, grade:88, attendance:92, engagement:"Alto", trend:"up", risk:false, lastAccess:"hace 2h", source:"PAID" },
    { userId:"u-ar", courseId:"c-ld", progress:45, due:1, grade:0, attendance:0, engagement:"Medio", trend:"flat", lastAccess:"ayer", source:"PAID" },
    { userId:"u-ar", courseId:"c-or", progress:88, due:0, source:"PAID", lastAccess:"hace 2h" },
    { userId:"u-ar", courseId:"c-pa", progress:30, due:3, source:"PAID", lastAccess:"hace 1d" },
    { userId:"u-ar", courseId:"c-ws", progress:12, due:1, source:"PAID", lastAccess:"hace 2d" },
    { userId:"u-ar", courseId:"c-sc", progress:0, due:0, source:"PAID", lastAccess:"—" },
  ]});

  // --- Roster de Public Forum I (panel del profesor) ---
  await db.enrollment.createMany({ data: [
    { userId:"u-sc", courseId:"c-pf", progress:97, grade:96, attendance:98, engagement:"Alto", trend:"up", risk:false, lastAccess:"hace 2h", source:"PAID" },
    { userId:"u-ap", courseId:"c-pf", progress:90, grade:91, attendance:95, engagement:"Alto", trend:"up", risk:false, lastAccess:"hace 5h", source:"PAID" },
    { userId:"u-mt", courseId:"c-pf", progress:84, grade:89, attendance:90, engagement:"Medio", trend:"flat", risk:false, lastAccess:"ayer", source:"PAID" },
    { userId:"u-df", courseId:"c-pf", progress:48, grade:74, attendance:78, engagement:"Bajo", trend:"down", risk:true, lastAccess:"hace 4d", source:"PAID" },
    { userId:"u-cn", courseId:"c-pf", progress:66, grade:82, attendance:88, engagement:"Medio", trend:"up", risk:false, lastAccess:"hace 1d", source:"PAID" },
    { userId:"u-jb", courseId:"c-pf", progress:40, grade:69, attendance:65, engagement:"Bajo", trend:"down", risk:true, lastAccess:"hace 6d", source:"PAID" },
    { userId:"u-vc", courseId:"c-pf", progress:55, grade:85, attendance:94, engagement:"Alto", trend:"up", risk:false, lastAccess:"hace 3h", source:"PAID" },
  ]});

  // --- Foro ---
  await db.forumThread.createMany({ data: [
    { id:"t-1", title:"¿Cómo refutar un argumento de impacto sin caer en falacias?", author:"Camila Núñez", initials:"CN", tag:"Refutación", replies:8, views:42, pinned:true, lastLabel:"hace 2h", excerpt:"Estuve en el simulacro y me costó atacar el impacto sin que el juez lo viera como ataque personal. ¿Tips?", position:0 },
    { id:"t-2", title:"Plantilla de Contention que uso para PF (compartida)", author:"Saúl Castillo", initials:"SC", tag:"Recursos", replies:14, views:96, pinned:true, lastLabel:"hace 6h", excerpt:"Les dejo mi estructura Claim · Warrant · Impact en una página. Me sirvió para semifinal.", position:1 },
    { id:"t-3", title:"Dudas sobre el crossfire — ¿quién pregunta primero?", author:"Diego Fermín", initials:"DF", tag:"Reglas", replies:3, views:21, pinned:false, lastLabel:"hace 1d", excerpt:"Nunca me queda claro el orden en Public Forum. ¿Alguien me lo explica simple?", position:2 },
    { id:"t-4", title:"Mi evidencia para el tema de este mes", author:"Analía Reyes", initials:"AR", tag:"Evidencia", replies:5, views:33, pinned:false, lastLabel:"hace 2d", excerpt:"Encontré un estudio de 2025 muy fuerte. ¿Lo revisamos juntos antes del torneo?", position:3 },
  ]});
  await db.forumPost.createMany({ data: [
    { threadId:"t-1", author:"Camila Núñez", initials:"CN", role:"Estudiante", whenLabel:"hace 2h", op:true, body:"Estuve en el simulacro y me costó atacar el impacto del rival sin que el juez lo viera como ataque personal. ¿Cómo lo separan ustedes?", position:0 },
    { threadId:"t-1", author:"Coach Saúl Méndez", initials:"SM", role:"Coach", whenLabel:"hace 1h", op:false, body:"Buena pregunta. Ataca la <b>lógica</b>, no a la persona: cuestiona la probabilidad y la magnitud del impacto. “Aunque eso fuera cierto, su probabilidad es baja porque…”. Eso es refutar, no descalificar.", position:1 },
    { threadId:"t-1", author:"Saúl Castillo", initials:"SC", role:"Estudiante", whenLabel:"hace 40 min", op:false, body:"A mí me funciona el “turn”: tomo su impacto y muestro que en realidad juega a mi favor. El juez lo ama.", position:2 },
  ]});

  // --- Mensajería ---
  await db.conversation.createMany({ data: [
    { id:"cv-1", initials:"SM", name:"Coach Saúl Méndez", lastLabel:"Te dejé feedback en la grabación 👏", whenLabel:"hace 1h", unread:2, online:true, navy:true, position:0 },
    { id:"cv-2", initials:"CN", name:"Camila Núñez", lastLabel:"¿Practicamos crossfire mañana?", whenLabel:"hace 3h", unread:0, online:true, navy:false, position:1 },
    { id:"cv-3", initials:"OTR", name:"Equipo OTR (anuncios)", lastLabel:"Recordatorio: torneo interno el sábado", whenLabel:"ayer", unread:0, online:false, navy:true, position:2 },
    { id:"cv-4", initials:"AP", name:"Agustín Polanco", lastLabel:"Te paso mi evidencia", whenLabel:"ayer", unread:0, online:false, navy:false, position:3 },
  ]});
  await db.chatMessage.createMany({ data: [
    { conversationId:"cv-1", me:false, body:"¡Hola Analía! Vi tu grabación de 2 minutos.", timeLabel:"10:02", position:0 },
    { conversationId:"cv-1", me:false, body:"Tu claim quedó clarísimo en los primeros 10 segundos 👏", timeLabel:"10:02", position:1 },
    { conversationId:"cv-1", me:true, body:"¡Gracias coach! Sentí que el cierre me quedó flojo.", timeLabel:"10:05", position:2 },
    { conversationId:"cv-1", me:false, body:"Un poco. Cierra siempre con el impacto, no con un resumen. Vuelve a grabar el último tramo y me lo mandas.", timeLabel:"10:06", position:3 },
    { conversationId:"cv-1", me:true, body:"Hecho. Lo subo hoy mismo 💪", timeLabel:"10:08", position:4 },
  ]});

  console.log("✓ Seed completo");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });

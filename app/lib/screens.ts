// @ts-nocheck
/* OTR LMS · registro de pantallas + rutas */
import { S as core } from "./scr-core";
import { S as learn } from "./scr-learn";
import { S as teacher } from "./scr-teacher";
import { S as profile } from "./scr-profile";
import { S as community } from "./scr-community";
import { S as extra } from "./scr-extra";
import { S as arsenal } from "./scr-arsenal";
import { S as hub } from "./scr-hub";
import { S as certificate } from "./scr-certificate";
import { S as debate } from "./scr-debate";
import { S as marketplace } from "./scr-marketplace";
import { S as parent } from "./scr-parent";
import { S as lifetime } from "./scr-lifetime";
import { S as coachwork } from "./scr-coachwork";
import { S as admin } from "./scr-admin";
import { S as adminUsers } from "./scr-admin-users";
import { S as mybookings } from "./scr-mybookings";
import { S as placement } from "./scr-placement";

export const SCREENS = { ...core, ...learn, ...teacher, ...profile, ...community, ...extra, ...arsenal, ...hub, ...certificate, ...debate, ...marketplace, ...parent, ...lifetime, ...coachwork, ...admin, ...adminUsers, ...mybookings, ...placement };

export const ROUTES = {
  dashboard:      { screen:'dashboard',    nav:'dashboard',    crumbs:['Inicio'] },
  search:         { screen:'search',       nav:'',             crumbs:['Buscar'] },
  catalog:        { screen:'catalog',      nav:'catalog',      crumbs:['Catálogo'] },
  // Crumbs genéricos (Moodle multi-curso): el nombre real del curso/lección se
  // muestra en el hero de cada pantalla, no se hardcodea aquí.
  course:         { screen:'course',       nav:'course',       crumbs:['Mi aprendizaje'] },
  'course-index': { screen:'courseIndex',  nav:'course',       crumbs:['Mi aprendizaje','Índice'] },
  lesson:         { screen:'lesson',       nav:'course',       crumbs:['Mi aprendizaje','Lección'] },
  assignment:     { screen:'assignment',   nav:'course',       crumbs:['Mi aprendizaje','Entrega'] },
  quiz:           { screen:'quiz',         nav:'course',       crumbs:['Mi aprendizaje','Examen'] },
  'quiz-results': { screen:'quizResults',  nav:'course',       crumbs:['Mi aprendizaje','Resultados'] },
  player:         { screen:'player',       nav:'player',       crumbs:['Mi aprendizaje','Lección'] },
  progress:       { screen:'progress',     nav:'progress',     crumbs:['Centro de progreso','Niveles'] },
  badges:         { screen:'badges',       nav:'badges',       crumbs:['Centro de progreso','Logros'] },
  // RE-REGISTRADA: el alumno necesita ver sus notas + el feedback del coach (S.grades).
  grades:         { screen:'grades',       nav:'grades',       crumbs:['Centro de progreso','Mis calificaciones'] },
  // APAGADAS (PRD-estricto §15): 'forum'/'forum-thread' (discussion boards =
  // Fase 3 §10, con espacios cerrados y moderados para menores — este foro abierto
  // no cumple ese diseño). Las pantallas siguen exportadas; solo pierden ruta.
  profile:        { screen:'profile',      nav:'profile',      crumbs:['Perfil'] },
  messages:       { screen:'messages',     nav:'messages',     crumbs:['Mensajes'] },
  teacher:        { screen:'teacher',      nav:'teacher',      crumbs:['Profesor','Tracking'], role:'teacher' },
  // 'gradebook' APAGADA (PRD-estricto): el feedback del PDF son ballots/rúbricas (§6.5) y session tools (§7.5), no una matriz de notas.
  participants:   { screen:'participants', nav:'participants', crumbs:['Profesor','Participantes'], role:'teacher' },
  manage:         { screen:'manage',       nav:'manage',       crumbs:['Profesor','Mis cursos'], role:'teacher' },
  // Constructor de curso estilo Moodle (secciones + actividades). El courseId va en
  // window.__builderCourseId (ruta plana, sin params) → ver S.courseBuilder.
  'course-builder': { screen:'courseBuilder', nav:'manage',     crumbs:['Profesor','Constructor de curso'], role:'teacher' },
  // 'arsenal' APAGADA (PRD-estricto): no existe en el PDF — el "motion library" (§6.4) es otra cosa y es Fase 2.
  coach:          { screen:'coach',        nav:'profile',      crumbs:['OTR','Coach'] },
  // 'hub' APAGADA (PRD-estricto): el HQ del PDF es el Dashboard (§4); Learn = Cursos + Mi aprendizaje.
  // Marketplace de coaches (PRD §7): 'explore' es el item "Coaches" del nav;
  // 'marketplace' queda como alias explícito de la misma pantalla.
  explore:        { screen:'marketplace',  nav:'explore',      crumbs:['Marketplace','Coaches'] },
  marketplace:    { screen:'marketplace',  nav:'explore',      crumbs:['Marketplace','Coaches'] },
  // Coach Workspace (PRD §7.5, supply-side) → scr-coachwork.ts.
  coachwork:      { screen:'coachwork',    nav:'coachwork',    crumbs:['Espacio de coach','Reservas e ingresos'] },
  // Mis reservas (PRD §7.3 paso 6 + §4.2 ④, demand-side) → scr-mybookings.ts.
  'my-bookings':  { screen:'myBookings',   nav:'my-bookings',  crumbs:['Marketplace','Mis reservas'] },
  // 'my-experience' APAGADA (PRD-estricto): preferencias de experiencia no están en el PDF.
  onboarding:     { screen:'onboarding',   nav:'dashboard',    crumbs:['Inicio','Configura tu experiencia'] },
  // Placement inicial (PRD §2.2 Journey A + §4.3): auto-evaluación de 3 min para
  // el usuario nuevo sin placement → puebla el Skill Graph y fija User.placedAt.
  placement:      { screen:'placement',    nav:'dashboard',    crumbs:['Inicio','Tu punto de partida'] },
  certificate:    { screen:'certificate',  nav:'badges',       crumbs:['Logros','Certificado'] },
  // Debate Hub (flagship, PRD §6) → pantalla real S.debateHub.
  debate:         { screen:'debateHub',    nav:'debate',       crumbs:['Debate Hub'] },
  // Parent Portal (PRD §11) → pantalla real S.parentPortal.
  parent:         { screen:'parentPortal', nav:'parent',       crumbs:['Portal de familia'] },
  // Lifetime Progress Profile (PRD §8) + Membresía (PRD §13) → scr-lifetime.ts.
  lifetime:       { screen:'lifetimeProfile', nav:'lifetime',  crumbs:['Centro de progreso','Mi trayectoria'] },
  membership:     { screen:'membership',   nav:'membership',   crumbs:['Cuenta','Membresía'] },
  // Consola de moderación (PRD §3.3 admin console mínima, §7.4 reportes) → scr-admin.ts.
  admin:          { screen:'adminConsole', nav:'admin',        crumbs:['Administración','Moderación'], role:'admin' },
  // Admin → Gestión de usuarios (PRD §3.3): roles, verificación de coach, suspensión → scr-admin-users.ts.
  'admin-users':  { screen:'adminUsers',   nav:'admin-users',  crumbs:['Administración','Gestión de usuarios'], role:'admin' },
};

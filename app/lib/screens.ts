// @ts-nocheck
/* OTR LMS · registro de pantallas + rutas */
import { S as core } from "./scr-core";
import { S as learn } from "./scr-learn";
import { S as teacher } from "./scr-teacher";
import { S as profile } from "./scr-profile";
import { S as community } from "./scr-community";
import { S as kit } from "./scr-kit";
import { S as extra } from "./scr-extra";

export const SCREENS = { ...core, ...learn, ...teacher, ...profile, ...community, ...kit, ...extra };

export const ROUTES = {
  dashboard:      { screen:'dashboard',    nav:'dashboard',    crumbs:['Inicio'] },
  search:         { screen:'search',       nav:'',             crumbs:['Buscar'] },
  catalog:        { screen:'catalog',      nav:'catalog',      crumbs:['Catálogo'] },
  course:         { screen:'course',       nav:'course',       crumbs:['Mis cursos','Public Forum I'] },
  'course-index': { screen:'courseIndex',  nav:'course',       crumbs:['Mis cursos','Public Forum I','Índice'] },
  lesson:         { screen:'lesson',       nav:'course',       crumbs:['Public Forum I','Unidad 2','Claim · Warrant · Impact'] },
  assignment:     { screen:'assignment',   nav:'course',       crumbs:['Public Forum I','Grabación: discurso 2 min'] },
  quiz:           { screen:'quiz',         nav:'course',       crumbs:['Public Forum I','Examen de unidad'] },
  'quiz-results': { screen:'quizResults',  nav:'course',       crumbs:['Public Forum I','Examen · Resultados'] },
  player:         { screen:'player',       nav:'player',       crumbs:['Public Forum I','Simulacro con jueces'] },
  progress:       { screen:'progress',     nav:'progress',     crumbs:['Mi progreso'] },
  badges:         { screen:'badges',       nav:'badges',       crumbs:['Logros'] },
  grades:         { screen:'grades',       nav:'grades',       crumbs:['Calificaciones'] },
  profile:        { screen:'profile',      nav:'profile',      crumbs:['Perfil'] },
  forum:          { screen:'forum',        nav:'forum',        crumbs:['Public Forum I','Foro'] },
  'forum-thread': { screen:'forumThread',  nav:'forum',        crumbs:['Public Forum I','Foro','Discusión'] },
  messages:       { screen:'messages',     nav:'messages',     crumbs:['Mensajes'] },
  teacher:        { screen:'teacher',      nav:'teacher',      crumbs:['Profesor','Tracking'], role:'teacher' },
  gradebook:      { screen:'gradebook',    nav:'gradebook',    crumbs:['Profesor','Calificador'], role:'teacher' },
  participants:   { screen:'participants', nav:'participants', crumbs:['Profesor','Participantes'], role:'teacher' },
  manage:         { screen:'manage',       nav:'manage',       crumbs:['Profesor','Gestión de contenido'], role:'teacher' },
  kit:            { screen:'kit',          nav:'kit',          crumbs:['Sistema de diseño'] },
};

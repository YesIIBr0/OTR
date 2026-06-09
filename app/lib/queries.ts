// OTR LMS · funciones de consulta — leen de la base de datos (Prisma).
import { db } from "./db";
import { esc } from "./esc";

const ME_EMAIL = "analia.reyes@otr.do";
const TEACHER_EMAIL = "saul@otr.do";
const MAIN_COURSE = "PF-101";

export async function getAppData(email: string = ME_EMAIL) {
  const me = await db.user.findUnique({ where: { email } });
  const isTeacher = me?.role === "TEACHER" || me?.role === "ADMIN";
  const [
    teacher, levels, meEnrollments, pfModules, pfStudents,
    gradeCells, competencies, badges, notifications, events, activity,
    threads, mainThread, convos, allCourses, allModules, taughtCourses,
  ] = await Promise.all([
    db.user.findUnique({ where: { email: TEACHER_EMAIL } }),
    db.level.findMany({ orderBy: { position: "asc" } }),
    db.enrollment.findMany({ where: { user: { email } }, include: { course: true }, orderBy: { course: { position: "asc" } } }),
    db.module.findMany({ where: { course: { code: MAIN_COURSE } }, include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } }),
    db.enrollment.findMany({ where: { course: { code: MAIN_COURSE } }, include: { user: true }, orderBy: { user: { xp: "desc" } } }),
    db.gradeCell.findMany({ orderBy: [{ studentPos: "asc" }, { colPos: "asc" }] }),
    db.competency.findMany({ orderBy: { position: "asc" } }),
    db.badge.findMany({ orderBy: { position: "asc" } }),
    db.notification.findMany({ orderBy: { position: "asc" } }),
    db.eventItem.findMany({ orderBy: { position: "asc" } }),
    db.activityItem.findMany({ orderBy: { position: "asc" } }),
    db.forumThread.findMany({ orderBy: { position: "asc" } }),
    db.forumThread.findFirst({ where: { pinned: true }, orderBy: { position: "asc" }, include: { posts: { orderBy: { position: "asc" } } } }),
    db.conversation.findMany({ orderBy: { position: "asc" }, include: { messages: { orderBy: { position: "asc" } } } }),
    db.course.findMany({ orderBy: { position: "asc" }, select: { id: true, code: true, name: true, color: true, coachName: true, priceCents: true } }),
    db.module.findMany({ orderBy: { position: "asc" }, select: { id: true, courseId: true, title: true } }),
    isTeacher
      ? db.course.findMany({ where: { teacher: { email } }, include: { modules: { include: { lessons: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } } }, orderBy: { position: "asc" } })
      : Promise.resolve([]),
  ]);

  const curLevel = levels.find((l) => l.name === me?.level) ?? levels[0];
  const nextLevel = levels.find((l) => l.position === (curLevel?.position ?? 0) + 1);
  const xpLevelStart = curLevel?.startXp ?? 0;
  const xpNext = nextLevel?.startXp ?? (curLevel?.startXp ?? 0);

  const colMap = new Map<number, string>();
  gradeCells.forEach((c) => colMap.set(c.colPos, c.colName));
  const cols = [...colMap.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  const studentPositions = [...new Set(gradeCells.map((c) => c.studentPos))].sort((a, b) => a - b);
  const gbRows = studentPositions.map((sp) => {
    const cells = gradeCells.filter((c) => c.studentPos === sp).sort((a, b) => a.colPos - b.colPos);
    return { n: esc(cells[0]?.studentName), i: esc(cells[0]?.studentInit), g: cells.map((c) => c.value) };
  });

  const enrolledIds = new Set(meEnrollments.map((e) => e.courseId));

  // Insignias automáticas (derivadas de logros reales del usuario)
  const mySubs = me ? await db.submission.findMany({ where: { userId: me.id } }) : [];
  const lvl = me?.level || "Novato";
  const gotBadge = (name: string) => {
    switch (name) {
      case "Primer discurso": return mySubs.length >= 1;
      case "Racha de 7 días": return (me?.streak ?? 0) >= 7;
      case "Refutador": return (me?.xp ?? 0) >= 1500;
      case "Semifinalista": return ["Varsity", "Elite"].includes(lvl);
      case "Voz de oro": return mySubs.some((s) => (s.grade ?? 0) >= 95);
      case "Campeón": return lvl === "Elite";
      default: return false;
    }
  };

  return {
    me: { name: esc(me?.name), email: me?.email, initials: esc(me?.initials), level: me?.level, streak: me?.streak, role: "student" },
    teacher: { name: esc(teacher?.name), email: teacher?.email, initials: esc(teacher?.initials), role: "teacher" },
    levels: levels.map((l) => ({ id: l.name.toLowerCase(), name: l.name, range: l.range, color: l.color })),
    xp: me?.xp ?? 0,
    xpNext,
    xpLevelStart,
    courses: meEnrollments.map((e) => ({
      id: e.course.code, dbId: e.course.id, code: e.course.code, name: esc(e.course.name), coach: esc(e.course.coachName),
      color: e.course.color, progress: e.progress, next: esc(e.course.next),
      students: e.course.studentsCount, lessons: e.course.lessonsCount, due: e.due,
    })),
    courseModules: pfModules.map((m) => ({
      t: esc(m.title), done: m.done, locked: m.locked,
      items: m.lessons.map((l) => ({
        id: l.id, t: esc(l.title), type: l.type, done: l.done, locked: l.locked, grade: l.grade, dur: l.dur, due: l.due,
        videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: l.contentHtml,
      })),
    })),
    students: pfStudents.map((e) => ({
      n: esc(e.user.name), i: esc(e.user.initials), lvl: e.user.level, xp: e.user.xp,
      grade: e.grade, att: e.attendance, eng: e.engagement, trend: e.trend, risk: e.risk, last: e.lastAccess,
    })),
    gradebook: { cols, rows: gbRows },
    competencies: competencies.map((c) => ({ name: c.name, score: c.score })),
    badges: badges.map((b) => ({ n: b.name, d: b.description, got: gotBadge(b.name), ic: b.icon, tone: b.tone })),
    events: events.map((e) => ({ t: e.title, c: e.course, when: e.whenLabel, tone: e.tone })),
    activity: activity.map((a) => ({ who: esc(a.who), a: esc(a.action), t: esc(a.target), when: a.whenLabel })),
    notifications: notifications.filter((n) => !n.userId || n.userId === me?.id).map((n) => ({ ic: n.icon, tone: n.tone, t: esc(n.title), d: esc(n.detail), when: n.whenLabel, unread: n.unread })),
    forum: threads.map((t) => ({ id: t.id, title: esc(t.title), author: esc(t.author), ini: esc(t.initials), tag: esc(t.tag), replies: t.replies, views: t.views, pinned: t.pinned, last: t.lastLabel, excerpt: esc(t.excerpt) })),
    forumThread: mainThread ? {
      id: mainThread.id, title: esc(mainThread.title), tag: esc(mainThread.tag),
      posts: mainThread.posts.map((p) => ({ author: esc(p.author), ini: esc(p.initials), role: p.role, when: p.whenLabel, op: p.op, body: esc(p.body) })),
    } : { id: "", title: "", tag: "", posts: [] },
    messages: convos.map((c) => ({ ini: esc(c.initials), name: esc(c.name), last: esc(c.lastLabel), when: c.whenLabel, unread: c.unread, online: c.online, navy: c.navy })),
    chat: (convos[0]?.messages ?? []).map((m) => ({ me: m.me, body: esc(m.body), when: m.timeLabel })),
    manage: { courses: allCourses.map((c) => ({ id: c.id, code: c.code, name: esc(c.name) })), modules: allModules.map((m) => ({ id: m.id, courseId: m.courseId, title: esc(m.title) })) },
    catalog: allCourses.map((c) => ({ id: c.id, code: c.code, name: esc(c.name), coach: esc(c.coachName), color: c.color, price: c.priceCents, enrolled: enrolledIds.has(c.id) })),
    teacherCourses: taughtCourses.map((c) => ({
      id: c.id, code: c.code, name: esc(c.name), color: c.color,
      modules: c.modules.map((m) => ({ id: m.id, title: esc(m.title), lessons: m.lessons.map((l) => ({ id: l.id, title: esc(l.title), type: l.type, videoKind: l.videoKind, videoSrc: l.videoSrc, contentHtml: l.contentHtml })) })),
    })),
  };
}

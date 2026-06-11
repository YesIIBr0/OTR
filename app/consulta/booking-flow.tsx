"use client";

// /consulta · Flujo interactivo multi-paso para reservar la consulta de estrategia
// gratuita (30 min). Calendario propio (sin librerías), fetch de slots libres, validación
// en vivo y confirmación contra POST /api/consultations. Mobile-first, animado, on-brand OTR.
//
// Importante de zona horaria: la API devuelve labels ya formateados en hora de Santo
// Domingo (UTC-4). Aquí NO recalculamos horas — mostramos los labels tal cual llegan.
// El calendario opera en fechas "calendario" (año/mes/día), que coinciden con la fecha
// local de RD para la práctica de reservar con >=12h de antelación.

import { useEffect, useMemo, useRef, useState } from "react";

type Slot = { iso: string; label: string };
type Step = 0 | 1 | 2 | 3 | 4 | 5;

const HORIZON_DAYS = 30; // debe coincidir con app/lib/consultations.ts
const STEP_LABELS = ["Inicio", "Fecha", "Hora", "Datos", "Confirmar"];

const LEVELS = [
  { v: "", t: "Selecciona tu nivel" },
  { v: "Nunca he debatido", t: "Nunca he debatido" },
  { v: "Algo de experiencia", t: "Algo de experiencia" },
  { v: "Competidor", t: "Competidor" },
];
const FORMATS = [
  { v: "", t: "¿Qué te interesa?" },
  { v: "Public Forum", t: "Public Forum" },
  { v: "Lincoln-Douglas", t: "Lincoln-Douglas" },
  { v: "Parliamentary", t: "Parliamentary" },
  { v: "Policy", t: "Policy" },
  { v: "Oratoria", t: "Oratoria" },
];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DOW_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// --- Helpers de fecha "calendario" (sin huso, día puro) ---
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m: 0-index
function startOfTodayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/* ----------------------------------- Iconos ----------------------------------- *
 * SVG inline, trazo fino, currentColor. Reemplazan a los emojis del diseño previo.
 * Todos comparten viewBox 24 y stroke 1.6 para una familia visual coherente.       */
type IconProps = { className?: string };
const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IcTarget = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.6" />
  </svg>
);
const IcMap = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);
const IcGift = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z" />
    <path d="M3 8h18v3H3zM12 8v12" />
    <path d="M12 8S10.5 4.5 8.5 5 9 8 12 8Zm0 0s1.5-3.5 3.5-3 -.5 3-3.5 3Z" />
  </svg>
);
const IcTrophy = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
    <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    <path d="M12 13v4M9 20h6M10 20l.5-3h3l.5 3" />
  </svg>
);
const IcCalendar = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);
const IcClock = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
const IcArrow = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);
const IcChevL = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
const IcChevR = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
const IcAlert = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);
const IcSpark = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);
const IcUser = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);
const IcStar = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={p.className}>
    <path d="M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.9 6.8 19.5 8 13.6 3.6 9.6l5.9-.7L12 3.5Z" />
  </svg>
);
const IcShield = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M12 3.5 19 6v5c0 4.5-2.9 7.8-7 9-4.1-1.2-7-4.5-7-9V6l7-2.5Z" />
    <path d="M9 12l2 2 4-4.5" />
  </svg>
);
const IcUsers = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 6a3 3 0 0 1 0 6M17 14.2c2.4.4 4 2.3 4 4.8" />
  </svg>
);
const IcGlobe = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
  </svg>
);
const IcHeart = (p: IconProps) => (
  <svg {...svgBase} className={p.className}>
    <path d="M12 20S4 15 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 15 12 20 12 20Z" />
  </svg>
);

export default function BookingFlow() {
  const [step, setStep] = useState<Step>(0);

  // Selección
  const [selectedKey, setSelectedKey] = useState<string>(""); // YYYY-MM-DD
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>(""); // "lunes, 9 de junio"
  const [slot, setSlot] = useState<Slot | null>(null);

  // Slots
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Formulario
  const [form, setForm] = useState({ name: "", email: "", phone: "", level: "", format: "", goal: "" });
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});

  // Estado de red
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [confirmed, setConfirmed] = useState<{ dateLabel: string; timeLabel: string } | null>(null);

  // Evita aplicar respuestas de availability fuera de orden.
  const fetchSeq = useRef(0);

  const nameOk = form.name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(form.email.trim());
  const formOk = nameOk && emailOk;

  const goStep = (s: Step) => {
    setError("");
    setStep(s);
  };

  // --- Cargar slots libres del día elegido ---
  async function loadSlots(key: string) {
    const seq = ++fetchSeq.current;
    setLoadingSlots(true);
    setSlots([]);
    setError("");
    try {
      const res = await fetch(`/api/consultations/availability?date=${encodeURIComponent(key)}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (seq !== fetchSeq.current) return; // respuesta obsoleta
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch {
      if (seq !== fetchSeq.current) return;
      setSlots([]);
      setError("No pudimos cargar los horarios. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      if (seq === fetchSeq.current) setLoadingSlots(false);
    }
  }

  function pickDate(key: string, label: string) {
    setSelectedKey(key);
    setSelectedDayLabel(label);
    setSlot(null);
    goStep(2);
    loadSlots(key);
  }

  function pickSlot(s: Slot) {
    setSlot(s);
    goStep(3);
  }

  // --- Confirmar reserva ---
  async function confirm() {
    if (!slot) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          level: form.level || undefined,
          format: form.format || undefined,
          goal: form.goal.trim() || undefined,
          slotAt: slot.iso,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // El slot se tomó mientras decidíamos → volver a horarios y recargar.
        setError("Ese horario acaba de ser reservado por alguien más. Elige otro, por favor.");
        setSlot(null);
        goStep(2);
        if (selectedKey) loadSlots(selectedKey);
        return;
      }
      if (!res.ok || !data?.ok) {
        setError(data?.error || "No pudimos confirmar la reserva. Inténtalo de nuevo.");
        return;
      }

      setConfirmed({
        dateLabel: data.booking?.dateLabel || selectedDayLabel,
        timeLabel: data.booking?.timeLabel || slot.label,
      });
      goStep(5);
    } catch {
      setError("No pudimos confirmar la reserva. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="otrc">
      <div className="otrc__shell">
        <header className="otrc__brand">
          <span className="otrc__logo">OTR Academy</span>
          <span className="otrc__tagline">By Students, For Students</span>
        </header>

        {step < 5 && <ProgressRail step={step} />}

        <section className="otrc__card">
          {step === 5 && <Confetti />}

          {step === 0 && <Intro onStart={() => goStep(1)} />}

          {step === 1 && (
            <DatePane
              onBack={() => goStep(0)}
              onPick={pickDate}
              selectedKey={selectedKey}
            />
          )}

          {step === 2 && (
            <TimePane
              dayLabel={selectedDayLabel}
              slots={slots}
              loading={loadingSlots}
              selectedIso={slot?.iso || ""}
              error={error}
              onBack={() => goStep(1)}
              onPick={pickSlot}
              onRetry={() => selectedKey && loadSlots(selectedKey)}
            />
          )}

          {step === 3 && (
            <FormPane
              form={form}
              setForm={setForm}
              touched={touched}
              setTouched={setTouched}
              nameOk={nameOk}
              emailOk={emailOk}
              canContinue={formOk}
              onBack={() => goStep(2)}
              onContinue={() => goStep(4)}
            />
          )}

          {step === 4 && slot && (
            <ConfirmPane
              dayLabel={selectedDayLabel}
              timeLabel={slot.label}
              name={form.name.trim()}
              submitting={submitting}
              error={error}
              onBack={() => goStep(3)}
              onConfirm={confirm}
            />
          )}

          {step === 5 && confirmed && (
            <SuccessPane email={form.email.trim()} dateLabel={confirmed.dateLabel} timeLabel={confirmed.timeLabel} />
          )}
        </section>

        {step < 5 && <CredibilityBand compact={step !== 0} />}
      </div>
    </main>
  );
}

/* --------------------- Indicador de pasos · efecto gradiente de meta --------------------- *
 * Barra de progreso continua + dots por paso. El micro-copy de avance refuerza el
 * "goal-gradient effect": cuanto más cerca de la meta, más motivación para terminar.     */
function ProgressRail({ step }: { step: number }) {
  const total = STEP_LABELS.length - 1; // 4 transiciones reales (Inicio no cuenta como esfuerzo)
  const done = Math.min(step, total);
  const remaining = Math.max(total - done, 0);
  const pct = Math.round((done / total) * 100);

  const advance =
    step === 0
      ? "Tu sesión gratuita está a solo 4 pasos."
      : remaining <= 0
      ? "¡Último vistazo! Estás a un paso de confirmar."
      : remaining === 1
      ? "Casi listo: estás a 1 paso de tu sesión."
      : `Vas muy bien: estás a ${remaining} pasos de tu sesión.`;

  return (
    <nav className="otrc__progress" aria-label="Progreso de la reserva">
      <div className="otrc__progress-top">
        <span className="otrc__progress-msg">{advance}</span>
        <span className="otrc__progress-pct">{pct}%</span>
      </div>

      <div className="otrc__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className="otrc__track-fill" style={{ width: `${pct}%` }} />
      </div>

      <ol className="otrc__steps">
        {STEP_LABELS.map((label, i) => {
          const state = i < step ? "is-done" : i === step ? "is-active" : "";
          return (
            <li key={label} className={`otrc__step ${state}`}>
              <span className="otrc__step-dot" aria-hidden="true">
                {i < step ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="otrc__step-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* --------------------------------- Paso 1: Intro --------------------------------- */
function Intro({ onStart }: { onStart: () => void }) {
  const perks: { Icon: React.FC<IconProps>; t: string; d: string }[] = [
    { Icon: IcTarget, t: "Assessment personalizado", d: "Diagnosticamos tu nivel y tus metas en debate u oratoria." },
    { Icon: IcMap, t: "Roadmap a tu medida", d: "Un plan claro de próximos pasos para crecer rápido." },
    { Icon: IcGift, t: "Materiales bonus", d: "Recursos y plantillas seleccionados según tu objetivo." },
    { Icon: IcTrophy, t: "Q&A con coach campeón", d: "Resuelve tus dudas en vivo con quien ya ganó torneos." },
  ];
  return (
    <div className="otrc__pane">
      <span className="otrc__pill">
        <span className="otrc__pill-dot" aria-hidden="true" />
        Consulta gratuita · 30 min · sin compromiso
      </span>
      <h1 className="otrc__title">Reserva tu sesión de estrategia gratuita</h1>
      <p className="otrc__lead">
        Una sesión 1:1 para entender dónde estás y trazar el camino hacia donde quieres llegar.
        Te vas con un <strong className="otrc__em">roadmap personalizado</strong>, valga o no que sigas con nosotros.
      </p>

      <ul className="otrc__perks">
        {perks.map((p, i) => (
          <li key={p.t} className="otrc__perk" style={{ ["--i" as string]: i }}>
            <span className="otrc__perk-ic" aria-hidden="true"><p.Icon /></span>
            <span className="otrc__perk-body">
              <span className="otrc__perk-t">{p.t}</span>
              <span className="otrc__perk-d">{p.d}</span>
            </span>
          </li>
        ))}
      </ul>

      <button className="otrc__btn otrc__btn--primary" onClick={onStart}>
        Empezar — elige tu día
        <IcArrow className="otrc__btn-ic" />
      </button>
      <p className="otrc__reassure">
        <IcShield className="otrc__reassure-ic" />
        Gratis de verdad. Sin tarjeta, sin letra pequeña.
      </p>
    </div>
  );
}

/* ------------------------------ Paso 2: Calendario ------------------------------ */
function DatePane({
  onBack,
  onPick,
  selectedKey,
}: {
  onBack: () => void;
  onPick: (key: string, label: string) => void;
  selectedKey: string;
}) {
  const today = useMemo(startOfTodayLocal, []);
  const maxDate = useMemo(() => addDays(today, HORIZON_DAYS), [today]);

  const [view, setView] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() })); // m: 0-index

  const grid = useMemo(() => buildMonth(view.y, view.m), [view.y, view.m]);

  const atFirstMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const atLastMonth = view.y === maxDate.getFullYear() && view.m === maxDate.getMonth();

  const prev = () => {
    if (atFirstMonth) return;
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  };
  const next = () => {
    if (atLastMonth) return;
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  };

  return (
    <div className="otrc__pane">
      <button className="otrc__back" onClick={onBack}>
        <IcChevL className="otrc__back-ic" /> Volver
      </button>
      <p className="otrc__eyebrow">Paso 1 de 4</p>
      <h2 className="otrc__title otrc__title--sm">Elige el día</h2>
      <p className="otrc__hint otrc__hint--lead">
        Atendemos de lunes a sábado, hora de Santo Domingo (UTC-4).
      </p>

      <div className="otrc__cal-head">
        <button className="otrc__cal-nav" onClick={prev} disabled={atFirstMonth} aria-label="Mes anterior">
          <IcChevL />
        </button>
        <span className="otrc__cal-month">{MONTHS[view.m]} {view.y}</span>
        <button className="otrc__cal-nav" onClick={next} disabled={atLastMonth} aria-label="Mes siguiente">
          <IcChevR />
        </button>
      </div>

      <div className="otrc__cal-grid">
        {DOW_SHORT.map((d) => (
          <div key={d} className="otrc__cal-dow">{d}</div>
        ))}
        {grid.map((cell, i) => {
          if (cell === null) return <div key={`e${i}`} className="otrc__day is-empty" aria-hidden="true" />;
          const date = new Date(view.y, view.m, cell);
          const dow = date.getDay();
          const key = dateKey(view.y, view.m, cell);
          const isSunday = dow === 0;
          const isPast = date < today;
          const isBeyond = date > maxDate;
          const isToday = date.getTime() === today.getTime();
          const disabled = isSunday || isPast || isBeyond;
          const selected = key === selectedKey;

          const label = `${capitalize(fullWeekday(dow))}, ${cell} de ${MONTHS[view.m]}`;
          const cls = [
            "otrc__day",
            disabled ? "is-disabled" : "is-open",
            selected ? "is-selected" : "",
            isToday ? "is-today" : "",
          ].join(" ").trim();

          return (
            <button
              key={key}
              className={cls}
              disabled={disabled}
              onClick={() => !disabled && onPick(key, label)}
              aria-label={disabled ? `${cell}, no disponible` : `Elegir ${label}`}
              aria-pressed={selected}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <p className="otrc__legend">
        <span className="otrc__legend-key" aria-hidden="true"><i className="otrc__legend-dot" /></span>
        Hoy
        <span className="otrc__legend-sep" aria-hidden="true" />
        <span className="otrc__legend-key otrc__legend-key--off" aria-hidden="true" />
        Domingos cerrados
      </p>
    </div>
  );
}

/* ------------------------------- Paso 3: Horarios ------------------------------- */
function TimePane({
  dayLabel,
  slots,
  loading,
  selectedIso,
  error,
  onBack,
  onPick,
  onRetry,
}: {
  dayLabel: string;
  slots: Slot[];
  loading: boolean;
  selectedIso: string;
  error: string;
  onBack: () => void;
  onPick: (s: Slot) => void;
  onRetry: () => void;
}) {
  // Escasez REAL: el nº de slots libres viene directo de /availability (slots.length).
  const count = slots.length;
  const scarce = count > 0 && count <= 3;

  return (
    <div className="otrc__pane">
      <button className="otrc__back" onClick={onBack}>
        <IcChevL className="otrc__back-ic" /> Cambiar día
      </button>
      <p className="otrc__eyebrow">Paso 2 de 4</p>
      <h2 className="otrc__title otrc__title--sm">Elige la hora</h2>
      {dayLabel && (
        <span className="otrc__chosen">
          <IcCalendar className="otrc__chosen-ic" />
          {dayLabel}
        </span>
      )}

      {!loading && count > 0 && (
        <div className={`otrc__avail ${scarce ? "is-scarce" : ""}`} role="status">
          <span className="otrc__avail-pulse" aria-hidden="true" />
          {scarce
            ? `Quedan solo ${count} ${count === 1 ? "horario" : "horarios"} este día`
            : `Quedan ${count} horarios disponibles este día`}
        </div>
      )}

      {error && (
        <div className="otrc__alert" role="alert">
          <IcAlert className="otrc__alert-ic" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="otrc__slots-skel" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="otrc__skel" style={{ ["--i" as string]: i }} />
          ))}
          <p className="otrc__loading-text">Buscando horarios disponibles…</p>
        </div>
      ) : count > 0 ? (
        <div className="otrc__slots">
          {slots.map((s, i) => (
            <button
              key={s.iso}
              className={`otrc__slot ${s.iso === selectedIso ? "is-selected" : ""}`}
              onClick={() => onPick(s)}
              style={{ ["--i" as string]: i }}
            >
              <IcClock className="otrc__slot-ic" />
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="otrc__empty">
          <span className="otrc__empty-ic" aria-hidden="true"><IcCalendar /></span>
          <div className="otrc__empty-t">No quedan horarios este día</div>
          <div className="otrc__empty-d">
            Todos los espacios están reservados o fuera de plazo.
            <br />
            Vuelve atrás y elige otra fecha.
          </div>
          <button className="otrc__btn otrc__btn--ghost otrc__btn--mt" onClick={onBack}>
            Elegir otro día
          </button>
          {error && (
            <button className="otrc__btn otrc__btn--ghost otrc__btn--mt-sm" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Paso 4: Datos -------------------------------- */
type FormState = { name: string; email: string; phone: string; level: string; format: string; goal: string };
function FormPane({
  form,
  setForm,
  touched,
  setTouched,
  nameOk,
  emailOk,
  canContinue,
  onBack,
  onContinue,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  touched: { name?: boolean; email?: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ name?: boolean; email?: boolean }>>;
  nameOk: boolean;
  emailOk: boolean;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const nameErr = touched.name && !nameOk;
  const emailErr = touched.email && !emailOk;

  return (
    <div className="otrc__pane">
      <button className="otrc__back" onClick={onBack}>
        <IcChevL className="otrc__back-ic" /> Cambiar hora
      </button>
      <p className="otrc__eyebrow">Paso 3 de 4</p>
      <h2 className="otrc__title otrc__title--sm">Tus datos</h2>
      <p className="otrc__hint otrc__hint--lead">Para conocerte mejor antes de la sesión. Solo nombre y correo son obligatorios.</p>

      <form onSubmit={(e) => { e.preventDefault(); if (canContinue) onContinue(); }}>
        <div className="otrc__field">
          <label className="otrc__label" htmlFor="otrc-name">Nombre completo *</label>
          <div className="otrc__control">
            <input
              id="otrc-name"
              className={`otrc__input ${nameErr ? "is-invalid" : ""} ${nameOk ? "is-valid" : ""}`}
              value={form.name}
              onChange={set("name")}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Tu nombre"
              autoComplete="name"
              maxLength={120}
            />
            {nameOk && <CheckTick />}
          </div>
          {nameErr && <p className="otrc__err">Ingresa tu nombre (mínimo 2 caracteres).</p>}
        </div>

        <div className="otrc__field">
          <label className="otrc__label" htmlFor="otrc-email">Correo electrónico *</label>
          <div className="otrc__control">
            <input
              id="otrc-email"
              type="email"
              className={`otrc__input ${emailErr ? "is-invalid" : ""} ${emailOk ? "is-valid" : ""}`}
              value={form.email}
              onChange={set("email")}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              maxLength={160}
            />
            {emailOk && <CheckTick />}
          </div>
          {emailErr && <p className="otrc__err">Escribe un correo válido.</p>}
        </div>

        <div className="otrc__field">
          <label className="otrc__label" htmlFor="otrc-phone">Teléfono (opcional)</label>
          <input
            id="otrc-phone"
            type="tel"
            className="otrc__input"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+1 809 000 0000"
            autoComplete="tel"
            maxLength={40}
          />
        </div>

        <div className="otrc__row otrc__row--2 otrc__field">
          <div>
            <label className="otrc__label" htmlFor="otrc-level">Tu nivel</label>
            <select id="otrc-level" className="otrc__select" value={form.level} onChange={set("level")}>
              {LEVELS.map((o) => <option key={o.t} value={o.v}>{o.t}</option>)}
            </select>
          </div>
          <div>
            <label className="otrc__label" htmlFor="otrc-format">Formato de interés</label>
            <select id="otrc-format" className="otrc__select" value={form.format} onChange={set("format")}>
              {FORMATS.map((o) => <option key={o.t} value={o.v}>{o.t}</option>)}
            </select>
          </div>
        </div>

        <div className="otrc__field">
          <label className="otrc__label" htmlFor="otrc-goal">¿Cuál es tu objetivo? (opcional)</label>
          <textarea
            id="otrc-goal"
            className="otrc__textarea"
            value={form.goal}
            onChange={set("goal")}
            placeholder="Cuéntanos qué quieres lograr: ganar un torneo, perder el miedo a hablar, mejorar tu argumentación…"
            maxLength={2000}
          />
          <p className="otrc__hint">Mientras más nos cuentes, más útil será tu roadmap.</p>
        </div>

        <div className="otrc__actions">
          <button type="button" className="otrc__btn otrc__btn--ghost" onClick={onBack}>Atrás</button>
          <button type="submit" className="otrc__btn otrc__btn--primary" disabled={!canContinue}>
            Continuar
            <IcArrow className="otrc__btn-ic" />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------ Paso 5: Confirmar ------------------------------ */
function ConfirmPane({
  dayLabel,
  timeLabel,
  name,
  submitting,
  error,
  onBack,
  onConfirm,
}: {
  dayLabel: string;
  timeLabel: string;
  name: string;
  submitting: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="otrc__pane">
      <button className="otrc__back" onClick={onBack} disabled={submitting}>
        <IcChevL className="otrc__back-ic" /> Editar datos
      </button>
      <p className="otrc__eyebrow">Paso 4 de 4</p>
      <h2 className="otrc__title otrc__title--sm">Confirma tu reserva</h2>
      <p className="otrc__hint otrc__hint--lead">Revisa que todo esté correcto. Es el último paso.</p>

      {error && (
        <div className="otrc__alert" role="alert">
          <IcAlert className="otrc__alert-ic" />
          <span>{error}</span>
        </div>
      )}

      <div className="otrc__summary">
        <div className="otrc__sum-row">
          <span className="otrc__sum-k"><IcUser className="otrc__sum-ic" /> A nombre de</span>
          <span className="otrc__sum-v">{name}</span>
        </div>
        <div className="otrc__sum-row">
          <span className="otrc__sum-k"><IcCalendar className="otrc__sum-ic" /> Fecha</span>
          <span className="otrc__sum-v is-accent">{dayLabel}</span>
        </div>
        <div className="otrc__sum-row">
          <span className="otrc__sum-k"><IcClock className="otrc__sum-ic" /> Hora</span>
          <span className="otrc__sum-v is-accent">{timeLabel}</span>
        </div>
        <div className="otrc__sum-row">
          <span className="otrc__sum-k"><IcSpark className="otrc__sum-ic" /> Duración</span>
          <span className="otrc__sum-v">30 minutos · 1:1</span>
        </div>
      </div>
      <p className="otrc__hint otrc__hint--tight">Hora de Santo Domingo (UTC-4).</p>

      <div className="otrc__actions">
        <button className="otrc__btn otrc__btn--ghost" onClick={onBack} disabled={submitting}>Atrás</button>
        <button className="otrc__btn otrc__btn--primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? <><span className="otrc__spinner" aria-hidden="true" /> Reservando…</> : "Confirmar reserva"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Paso 6: Éxito --------------------------------- *
 * Pico-final (peak-end): el cierre debe ser memorable. Check que se dibuja, aros que
 * se expanden, micro-copy cálido y próximos pasos claros antes del CTA al Aula.        */
function SuccessPane({ email, dateLabel, timeLabel }: { email: string; dateLabel: string; timeLabel: string }) {
  const nextSteps = [
    { Icon: IcCalendar, t: "Guarda la fecha", d: "Te llega un email de confirmación con el enlace de la videollamada." },
    { Icon: IcTarget, t: "Piensa tu objetivo", d: "Llega con una meta en mente; aprovecharemos cada minuto." },
    { Icon: IcMap, t: "Recibe tu roadmap", d: "Sales de la sesión con un plan personalizado, paso a paso." },
  ];
  return (
    <div className="otrc__pane otrc__success">
      <div className="otrc__check" aria-hidden="true">
        <span className="otrc__check-ring" />
        <span className="otrc__check-ring otrc__check-ring--2" />
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M14 24l7 7 14-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="otrc__eyebrow">Reserva confirmada</p>
      <h2 className="otrc__title otrc__title--lg">¡Listo! Te esperamos</h2>
      <div className="otrc__chosen otrc__chosen--success">
        <IcCalendar className="otrc__chosen-ic" />
        {dateLabel} · {timeLabel}
      </div>
      <p className="otrc__lead otrc__lead--center">
        Te enviamos un email de confirmación a <strong className="otrc__em">{email}</strong> con todos los detalles.
        Recibirás el enlace de la videollamada antes de la sesión.
      </p>

      <ul className="otrc__next">
        {nextSteps.map((s, i) => (
          <li key={s.t} className="otrc__next-item" style={{ ["--i" as string]: i }}>
            <span className="otrc__next-ic" aria-hidden="true"><s.Icon /></span>
            <span className="otrc__next-body">
              <span className="otrc__next-t">{s.t}</span>
              <span className="otrc__next-d">{s.d}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="otrc__actions">
        <a className="otrc__btn otrc__btn--ghost otrc__btn--link" href="/">
          Volver al inicio
        </a>
        <a className="otrc__btn otrc__btn--primary otrc__btn--link" href="/aula">
          Ir al Aula
          <IcArrow className="otrc__btn-ic" />
        </a>
      </div>
    </div>
  );
}

/* ----------------- Banda de credibilidad · prueba social REAL de OTR ----------------- *
 * Stats reales con count-up suave + 1 testimonio real (Isabella & Aaron). No intrusiva:
 * vive bajo la tarjeta. En pasos >0 se muestra compacta para no robar foco.              */
const STATS = [
  { Icon: IcUsers, target: 50, suffix: "+", label: "alumnos formados" },
  { Icon: IcGlobe, target: 15, suffix: "+", label: "torneos internacionales" },
  { Icon: IcHeart, target: 100, suffix: "%", label: "mejoran su confianza" },
];

function CredibilityBand({ compact }: { compact: boolean }) {
  return (
    <aside className={`otrc__cred ${compact ? "is-compact" : ""}`} aria-label="Credibilidad de OTR Academy">
      <div className="otrc__cred-stats">
        {STATS.map((s) => (
          <div key={s.label} className="otrc__stat">
            <span className="otrc__stat-ic" aria-hidden="true"><s.Icon /></span>
            <span className="otrc__stat-num">
              <CountUp target={s.target} suffix={s.suffix} />
            </span>
            <span className="otrc__stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <figure className="otrc__quote">
          <div className="otrc__quote-stars" aria-label="5 de 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <IcStar key={i} className="otrc__quote-star" />
            ))}
          </div>
          <blockquote className="otrc__quote-text">
            “Rompimos en Florida Blue Key tras solo dos meses entrenando con OTR. Pasamos del miedo escénico a
            sentirnos en control en cada ronda.”
          </blockquote>
          <figcaption className="otrc__quote-by">
            <span className="otrc__quote-avatar" aria-hidden="true"><IcUser /></span>
            <span>
              <span className="otrc__quote-name">Isabella &amp; Aaron</span>
              <span className="otrc__quote-role">Alumnos de OTR Academy</span>
            </span>
          </figcaption>
        </figure>
      )}
    </aside>
  );
}

/* Conteo suave (ease-out) hacia el target. Respeta prefers-reduced-motion. */
function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(target);
      return;
    }

    let raf = 0;
    let started = false;
    const DURATION = 1100;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / DURATION, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cúbico
        setVal(Math.round(eased * target));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Arranca cuando la banda entra en viewport (más memorable y honesto).
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ------------------------- Tick de validación en vivo (inputs) ------------------------- */
function CheckTick() {
  return (
    <span className="otrc__tick" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    </span>
  );
}

/* ----------------------------------- Confetti ----------------------------------- */
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["#4FA9E8", "#2E8BD0", "#7FC8F2", "#0C2340"];
    return Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.4,
      color: colors[i % colors.length],
      rot: Math.random() * 360,
    }));
  }, []);
  return (
    <div className="otrc__confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------- Utilidades fecha ------------------------------- */
// Construye la rejilla del mes: nulls de relleno antes del día 1 + los días del mes.
function buildMonth(year: number, month0: number): (number | null)[] {
  const firstDow = new Date(year, month0, 1).getDay(); // 0=dom
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}
function fullWeekday(dow: number): string {
  return ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][dow];
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

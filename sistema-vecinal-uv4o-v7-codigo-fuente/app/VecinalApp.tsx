"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";

type Neighbor = {
  id: number;
  code: string;
  token: string;
  name: string;
  street: string;
  lot: string;
  phone: string;
  generated: number;
  paid: number;
  active: boolean;
};

type Activity = {
  id: number;
  code: string;
  type: string;
  title: string;
  date: string;
  fine: number;
  status: "Programada" | "Cerrada";
};

type Payment = {
  id: number;
  neighborId: number;
  date: string;
  amount: number;
  note: string;
  receipt: string;
};

type AdminSection = "resumen" | "vecinos" | "actividades" | "asistencia" | "pagos" | "vistas" | "avisos" | "reportes";
type VisitorView = "inicio" | "sencillo" | "detallado";
type AttendanceStatus = "Presente" | "Faltó" | "Justificado";
type CardStatus = "done" | "pending" | "empty";
type CardRow = {
  label: string;
  kind: "attendance" | "contribution";
  values: CardStatus[];
  details: string[];
};
type ViewEditorMode = "sencillo" | "detallado" | "apariencia";
type ThemeSettings = {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  accent: string;
  background: string;
  paper: string;
};
type ViewLabels = {
  managementYear: string;
  simpleTitle: string;
  detailedTitle: string;
  coverSubtitle: string;
};

const defaultTheme: ThemeSettings = {
  primary: "#102a52",
  secondary: "#1d4e89",
  success: "#16805b",
  danger: "#b12727",
  accent: "#f1b933",
  background: "#eef3f8",
  paper: "#faf9f4",
};

const defaultViewLabels: ViewLabels = {
  managementYear: "2026",
  simpleTitle: "Tarjeta de control vecinal",
  detailedTitle: "Control anual por categoría",
  coverSubtitle: "Tu tarjeta vecinal siempre disponible y fácil de entender.",
};

const initialNeighbors: Neighbor[] = [
  { id: 1, code: "U.V. 4-O-001", token: "demo-martha-701", name: "Martha Mamani", street: "Av. Principal", lot: "701", phone: "", generated: 155, paid: 120, active: true },
  { id: 2, code: "U.V. 4-O-002", token: "demo-cyntia-438", name: "Cyntia Bustillos Ala", street: "Calle Los Pinos", lot: "438", phone: "", generated: 50, paid: 0, active: true },
  { id: 3, code: "U.V. 4-O-003", token: "demo-felipe-702", name: "Felipe Rojas", street: "Calle 4-O", lot: "702", phone: "", generated: 90, paid: 90, active: true },
];

const initialActivities: Activity[] = [
  { id: 1, code: "ACT-001", type: "Asamblea", title: "Reunión mensual de agosto", date: "2026-08-23", fine: 50, status: "Programada" },
  { id: 2, code: "ACT-002", type: "Trabajo", title: "Limpieza de áreas comunes", date: "2026-07-12", fine: 80, status: "Cerrada" },
  { id: 3, code: "ACT-003", type: "Marcha / desfile", title: "Desfile cívico vecinal", date: "2026-08-06", fine: 60, status: "Cerrada" },
];

const initialPayments: Payment[] = [
  { id: 1, neighborId: 1, date: "2026-08-02", amount: 50, note: "Pago de cuota y multa", receipt: "REC-0001" },
  { id: 2, neighborId: 1, date: "2026-06-15", amount: 70, note: "Pago parcial", receipt: "REC-0002" },
  { id: 3, neighborId: 3, date: "2026-07-20", amount: 90, note: "Pago total", receipt: "REC-0003" },
];

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const blankDetails = Array(12).fill("");
const cardRows: CardRow[] = [
  {
    label: "Asambleas",
    kind: "attendance",
    values: ["done", "done", "done", "done", "done", "done", "done", "pending", "empty", "empty", "empty", "empty"],
    details: ["Asamblea general", "Reunión mensual", "Reunión mensual", "Asamblea general", "Reunión mensual", "Reunión mensual", "Asamblea general", "Reunión mensual · multa Bs 50", ...blankDetails.slice(0, 4)],
  },
  {
    label: "Cuotas mensuales",
    kind: "contribution",
    values: ["done", "done", "done", "done", "done", "done", "done", "done", "empty", "empty", "empty", "empty"],
    details: ["Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", "Aporte para mantenimiento · Bs 5", ...blankDetails.slice(0, 4)],
  },
  {
    label: "Cuotas extras",
    kind: "contribution",
    values: ["empty", "done", "empty", "empty", "empty", "done", "empty", "empty", "empty", "empty", "empty", "empty"],
    details: ["", "Aporte para luminarias · Bs 20", "", "", "", "Aporte para mejoramiento de sede · Bs 55", "", "", "", "", "", ""],
  },
  {
    label: "Marchas / desfiles",
    kind: "attendance",
    values: ["empty", "empty", "empty", "empty", "empty", "empty", "done", "done", "empty", "empty", "empty", "empty"],
    details: ["", "", "", "", "", "", "Marcha cívica", "Desfile vecinal", "", "", "", ""],
  },
  {
    label: "Trabajos",
    kind: "attendance",
    values: ["empty", "empty", "done", "empty", "empty", "empty", "done", "pending", "empty", "empty", "empty", "empty"],
    details: ["", "", "Limpieza de la sede", "", "", "", "Limpieza de áreas comunes", "Mantenimiento de plaza · multa Bs 80", "", "", "", ""],
  },
];

const navItems: Array<{ id: AdminSection; label: string; icon: string }> = [
  { id: "resumen", label: "Inicio", icon: "⌂" },
  { id: "vecinos", label: "Vecinos y QR", icon: "◎" },
  { id: "actividades", label: "Actividades y cuotas", icon: "◇" },
  { id: "asistencia", label: "Asistencia", icon: "✓" },
  { id: "pagos", label: "Pagos", icon: "Bs" },
  { id: "vistas", label: "Vistas del vecino", icon: "✎" },
  { id: "avisos", label: "Avisos", icon: "!" },
  { id: "reportes", label: "Reportes", icon: "↓" },
];

function formatBs(value: number) {
  return new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function balanceOf(neighbor: Neighbor) {
  return Math.max(0, neighbor.generated - neighbor.paid);
}

function QrTile({ neighbor }: { neighbor: Neighbor }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    import("qrcode").then((QRCode) => QRCode.toDataURL(`https://vecinal.example/v/${neighbor.token}`, {
      width: 280,
      margin: 1,
      color: { dark: "#102a52", light: "#ffffff" },
    })).then((url) => {
      if (active) setSrc(url);
    });
    return () => { active = false; };
  }, [neighbor.token]);

  if (!src) return <div className="qr-loading">Generando QR…</div>;
  // El QR se genera como una imagen local de datos; no necesita optimización remota.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="qr-image" src={src} alt={`Código QR de ${neighbor.name}`} />;
}

export default function VecinalApp() {
  const [area, setArea] = useState<"vecino" | "admin">("vecino");
  const [visitorView, setVisitorView] = useState<VisitorView>("inicio");
  const [section, setSection] = useState<AdminSection>("resumen");
  const [neighbors, setNeighbors] = useState(initialNeighbors);
  const [activities, setActivities] = useState(initialActivities);
  const [payments, setPayments] = useState(initialPayments);
  const [cardData, setCardData] = useState<CardRow[]>(cardRows);
  const [viewEditorMode, setViewEditorMode] = useState<ViewEditorMode>("sencillo");
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultTheme);
  const [viewLabels, setViewLabels] = useState<ViewLabels>(defaultViewLabels);
  const [selectedCardCategory, setSelectedCardCategory] = useState(0);
  const [selectedCardMonth, setSelectedCardMonth] = useState(0);
  const [detailedIntro, setDetailedIntro] = useState("Deslice esta tarjeta para revisar los doce meses. Cada símbolo resume el registro y, debajo, encontrará la explicación de las actividades más recientes.");
  const [showNeighborForm, setShowNeighborForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [notice, setNotice] = useState({
    title: "Asamblea general de vecinos",
    body: "Domingo 23 de agosto · 19:00 · Sede vecinal",
    active: true,
    image: "",
  });
  const [selectedActivity, setSelectedActivity] = useState(activities[0].id);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>(
    Object.fromEntries(initialNeighbors.map((neighbor) => [neighbor.id, "Presente"]))
  );
  const [toast, setToast] = useState("");

  const demoNeighbor = neighbors[0];
  const demoBalance = balanceOf(demoNeighbor);
  const totalGenerated = neighbors.reduce((total, neighbor) => total + neighbor.generated, 0);
  const totalPaid = neighbors.reduce((total, neighbor) => total + neighbor.paid, 0);
  const selectedActivityData = activities.find((activity) => activity.id === selectedActivity) ?? activities[0];
  const selectedCardRow = cardData[selectedCardCategory] ?? cardData[0];
  const selectedCardStatus = selectedCardRow.values[selectedCardMonth] ?? "empty";
  const selectedCardDetail = selectedCardRow.details[selectedCardMonth] ?? "";
  const themeStyle = {
    "--navy": themeSettings.primary,
    "--blue": themeSettings.secondary,
    "--green": themeSettings.success,
    "--danger": themeSettings.danger,
    "--gold": themeSettings.accent,
    "--canvas": themeSettings.background,
    "--paper": themeSettings.paper,
  } as CSSProperties;

  const visitorPayments = useMemo(
    () => payments.filter((payment) => payment.neighborId === demoNeighbor.id).sort((a, b) => b.date.localeCompare(a.date)),
    [payments, demoNeighbor.id]
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openAdmin(target: AdminSection = "resumen") {
    setSection(target);
    setArea("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNeighbor(view: VisitorView = "inicio") {
    setVisitorView(view);
    setArea("vecino");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addNeighbor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const street = String(form.get("street") ?? "").trim();
    const lot = String(form.get("lot") ?? "").trim();
    if (!name || !street || !lot) return;
    const nextId = neighbors.length ? Math.max(...neighbors.map((neighbor) => neighbor.id)) + 1 : 1;
    const neighbor: Neighbor = {
      id: nextId,
      code: `U.V. 4-O-${String(nextId).padStart(3, "0")}`,
      token: `vecino-${nextId}-${crypto.randomUUID().slice(0, 8)}`,
      name,
      street,
      lot,
      phone: String(form.get("phone") ?? ""),
      generated: 0,
      paid: 0,
      active: true,
    };
    setNeighbors((current) => [...current, neighbor]);
    setAttendance((current) => ({ ...current, [neighbor.id]: "Presente" }));
    setShowNeighborForm(false);
    event.currentTarget.reset();
    notify("Vecino registrado y QR generado");
  }

  function deleteNeighbor(neighbor: Neighbor) {
    if (neighbors.length === 1) {
      notify("Debe conservar al menos un vecino registrado");
      return;
    }
    const confirmed = window.confirm(
      `¿Eliminar a ${neighbor.name}, lote ${neighbor.lot}?\n\nTambién se quitarán sus pagos de esta demostración. Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    setNeighbors((current) => current.filter((item) => item.id !== neighbor.id));
    setPayments((current) => current.filter((payment) => payment.neighborId !== neighbor.id));
    setAttendance((current) => {
      const updated = { ...current };
      delete updated[neighbor.id];
      return updated;
    });
    notify(`${neighbor.name} fue eliminado`);
  }

  function updateCardCell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") ?? "empty") as CardStatus;
    const detail = String(form.get("detail") ?? "").trim();
    setCardData((current) => current.map((row, rowIndex) => {
      if (rowIndex !== selectedCardCategory) return row;
      const values = [...row.values];
      const details = [...row.details];
      values[selectedCardMonth] = status;
      details[selectedCardMonth] = detail;
      return { ...row, values, details };
    }));
    notify("Cuadro actualizado en las dos vistas");
  }

  function updateDetailedIntro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setDetailedIntro(String(form.get("detailedIntro") ?? "").trim());
    notify("Texto del modo detallado actualizado");
  }

  function updateViewLabels(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setViewLabels({
      managementYear: String(form.get("managementYear") ?? viewLabels.managementYear).trim(),
      simpleTitle: String(form.get("simpleTitle") ?? viewLabels.simpleTitle).trim(),
      detailedTitle: String(form.get("detailedTitle") ?? viewLabels.detailedTitle).trim(),
      coverSubtitle: String(form.get("coverSubtitle") ?? viewLabels.coverSubtitle).trim(),
    });
    notify("Textos generales actualizados");
  }

  function saveTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    notify("Colores actualizados en todo el sistema");
  }

  function setThemeColor(key: keyof ThemeSettings, value: string) {
    setThemeSettings((current) => ({ ...current, [key]: value }));
  }

  function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const customType = String(form.get("customType") ?? "").trim();
    if (!title) return;
    const nextId = Math.max(...activities.map((activity) => activity.id)) + 1;
    setActivities((current) => [...current, {
      id: nextId,
      code: `ACT-${String(nextId).padStart(3, "0")}`,
      type: customType || String(form.get("type") ?? "Asamblea"),
      title,
      date: String(form.get("date") ?? "2026-08-23"),
      fine: Number(form.get("fine") ?? 0),
      status: "Programada",
    }]);
    setShowActivityForm(false);
    event.currentTarget.reset();
    notify("Actividad creada correctamente");
  }

  function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const neighborId = Number(form.get("neighbor"));
    const amount = Number(form.get("amount"));
    if (!neighborId || amount <= 0) return;
    const nextId = payments.length ? Math.max(...payments.map((payment) => payment.id)) + 1 : 1;
    const payment: Payment = {
      id: nextId,
      neighborId,
      amount,
      date: String(form.get("date") ?? "2026-08-18"),
      note: String(form.get("note") ?? "Pago de deuda"),
      receipt: `REC-${String(nextId).padStart(4, "0")}`,
    };
    setPayments((current) => [payment, ...current]);
    setNeighbors((current) => current.map((neighbor) => neighbor.id === neighborId ? { ...neighbor, paid: neighbor.paid + amount } : neighbor));
    event.currentTarget.reset();
    notify(`Pago registrado · ${payment.receipt}`);
  }

  function publishNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice((current) => ({
      ...current,
      title: String(form.get("title") ?? current.title),
      body: String(form.get("body") ?? current.body),
      active: true,
    }));
    notify("Aviso publicado en la vista del vecino");
  }

  function saveAttendance() {
    const absents = Object.values(attendance).filter((status) => status === "Faltó").length;
    notify(absents ? `${absents} falta(s) guardada(s); se generaría la multa correspondiente` : "Asistencia guardada sin faltas");
  }

  async function downloadQrPdf() {
    notify("Preparando PDF con todos los QR…");
    const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const activeNeighbors = neighbors.filter((neighbor) => neighbor.active);
    for (let index = 0; index < activeNeighbors.length; index += 1) {
      const neighbor = activeNeighbors[index];
      if (index > 0 && index % 6 === 0) doc.addPage();
      const slot = index % 6;
      const column = slot % 2;
      const row = Math.floor(slot / 2);
      const x = 14 + column * 96;
      const y = 18 + row * 88;
      const qr = await QRCode.toDataURL(`https://vecinal.example/v/${neighbor.token}`, { width: 500, margin: 1 });
      doc.setDrawColor(213, 223, 235);
      doc.roundedRect(x, y, 86, 78, 3, 3);
      doc.addImage(qr, "PNG", x + 20, y + 7, 46, 46);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(neighbor.name, x + 43, y + 57, { align: "center", maxWidth: 78 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${neighbor.code} · Lote ${neighbor.lot}`, x + 43, y + 65, { align: "center" });
      doc.setFontSize(7);
      doc.text(neighbor.street, x + 43, y + 72, { align: "center", maxWidth: 78 });
    }
    doc.save("QR_VECINOS_UV_4-O_2026.pdf");
    notify("PDF de QR descargado");
  }

  function downloadDebtorsCsv() {
    const lines = ["Codigo,Nombre,Lote,Saldo"];
    neighbors.filter((neighbor) => balanceOf(neighbor) > 0).forEach((neighbor) => {
      lines.push(`${neighbor.code},"${neighbor.name}",${neighbor.lot},${balanceOf(neighbor)}`);
    });
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "DEUDORES_UV_4-O_2026.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Reporte de deudores descargado");
  }

  if (area === "vecino") {
    if (visitorView === "sencillo") {
      return (
        <main className="visitor-page card-page" id="modo-sencillo" style={themeStyle}>
          <DemoBar onAdmin={() => openAdmin()} onNeighbor={() => openNeighbor("inicio")} active="vecino" />
          <div className="visitor-topline">
            <button className="back-button" onClick={() => setVisitorView("inicio")}>← Volver</button>
            <span>Modo sencillo</span>
          </div>
          <section className="physical-card physical-card-vertical">
            <div className="simple-card-title">
              <p>{viewLabels.simpleTitle}</p>
              <h1>Gestión {viewLabels.managementYear}</h1>
            </div>
            <div className="simple-owner-data">
              <span><small>Nombre</small><strong>{demoNeighbor.name}</strong></span>
              <span><small>Calle / avenida</small><strong>{demoNeighbor.street}</strong></span>
              <span><small>Lote</small><strong>{demoNeighbor.lot}</strong></span>
            </div>
            <div className="summary-control" aria-label="Tarjeta vecinal resumida">
              {cardData.map((row) => (
                <section className="summary-category" key={row.label}>
                  <header><h2>{row.label}</h2></header>
                  <div className="summary-month-grid">
                    {fullMonthNames.map((month, monthIndex) => {
                      const status = row.values[monthIndex];
                      const statusText = status === "done" ? (row.kind === "attendance" ? "Asistió" : "Pagó") : status === "pending" ? (row.kind === "attendance" ? "Faltó" : "Pendiente") : "Sin actividad";
                      return (
                        <div className={`summary-month ${status}`} key={`${row.label}-${month}`} aria-label={`${row.label}, ${month}: ${statusText}`}>
                          <span>{month.slice(0, 3)}</span>
                          <b>{status === "done" ? "✓" : status === "pending" ? "×" : ""}</b>
                          {status !== "empty" && row.details[monthIndex] && <small>{row.details[monthIndex]}</small>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className="card-total">
              <span>Deuda total</span>
              <strong>Bs {formatBs(demoBalance)}</strong>
            </div>
          </section>
        </main>
      );
    }

    if (visitorView === "detallado") {
      return (
        <main className="visitor-page detail-page" id="modo-detallado" style={themeStyle}>
          <DemoBar onAdmin={() => openAdmin()} onNeighbor={() => openNeighbor("inicio")} active="vecino" />
          <div className="visitor-topline">
            <button className="back-button" onClick={() => setVisitorView("inicio")}>← Volver</button>
            <span>Modo detallado</span>
          </div>
          <section className="detail-hero">
            <div>
              <span className="soft-label">Ficha vecinal · Gestión {viewLabels.managementYear}</span>
              <h1>{demoNeighbor.name}</h1>
              <p>{demoNeighbor.street} · Lote {demoNeighbor.lot} · {demoNeighbor.code}</p>
            </div>
            <div className="account-state clear-state">Control anual</div>
          </section>
          {notice.active && <MiniNotice notice={notice} />}
          <section className="detailed-control-card">
            <div className="section-heading">
              <div><span>Tarjeta digital</span><h2>{viewLabels.detailedTitle}</h2></div>
              <b>Gestión {viewLabels.managementYear}</b>
            </div>
            <p className="control-intro">{detailedIntro}</p>
            <div className="card-table-wrap detailed-table-wrap">
              <table className="physical-table detailed-physical-table">
                <thead><tr><th>Control</th>{monthNames.map((month) => <th key={month}>{month}</th>)}</tr></thead>
                <tbody>
                  {cardData.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      {row.values.map((status, index) => (
                        <td key={`${row.label}-${monthNames[index]}`} className={`card-status ${status}`} aria-label={`${row.label}, ${monthNames[index]}: ${status === "done" ? "cumplido" : status === "pending" ? "no cumplido" : "sin actividad"}`}>
                          {status === "done" ? <span>✓</span> : status === "pending" ? <span className="missed-mark">×</span> : <i>—</i>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="control-legend detailed-legend">
              <span><b className="legend-done">✓</b> Asistió o pagó</span>
              <span><b className="legend-missed">×</b> Falta o aporte pendiente</span>
              <span><b className="legend-empty">—</b> No hubo actividad</span>
            </div>
            <div className="control-explanations">
              <article><span className="explanation-icon missed">×</span><div><strong>Asamblea · 23 de agosto</strong><p>No asistió. Se generó una multa de Bs 50.</p></div></article>
              <article><span className="explanation-icon done">✓</span><div><strong>Cuota mensual · agosto</strong><p>Pagó Bs 5 para mantenimiento de la zona.</p></div></article>
              <article><span className="explanation-icon done">✓</span><div><strong>Desfile vecinal · 6 de agosto</strong><p>Asistió. No se generó ninguna multa.</p></div></article>
              <article><span className="explanation-icon done">✓</span><div><strong>Trabajo comunal · 12 de julio</strong><p>Participó en la limpieza de áreas comunes.</p></div></article>
            </div>
          </section>
          <section className="history-grid">
            <article className="history-panel">
              <div className="section-heading"><div><span>Actividades</span><h2>Historial explicado</h2></div><b>3 registros</b></div>
              <div className="timeline">
                <TimelineItem date="23 AGO" title="Reunión mensual de agosto" meta="No asistió · Multa exacta por inasistencia" amount="Bs 50" tone="red" />
                <TimelineItem date="12 JUL" title="Limpieza de áreas comunes" meta="Asistió y completó el trabajo · Sin multa" amount="Cumplido" tone="green" />
                <TimelineItem date="06 AGO" title="Desfile cívico vecinal" meta="Asistió al desfile · Sin multa" amount="Cumplido" tone="green" />
              </div>
            </article>
            <article className="history-panel">
              <div className="section-heading"><div><span>Pagos</span><h2>Comprobantes</h2></div><b>{visitorPayments.length}</b></div>
              <div className="payment-list">
                {visitorPayments.map((payment) => (
                  <div className="payment-item" key={payment.id}>
                    <div className="payment-mark">✓</div>
                    <div><strong>Bs {formatBs(payment.amount)}</strong><span>{formatDate(payment.date)} · {payment.receipt}</span></div>
                    <button onClick={() => notify(`Comprobante ${payment.receipt} preparado`)}>Ver</button>
                  </div>
                ))}
              </div>
            </article>
          </section>
          <section className="account-closing">
            <div className="section-heading account-heading"><div><span>Resumen económico</span><h2>Cierre de cuenta</h2></div><b>Actualizado hoy</b></div>
            <p>Este resumen se presenta al final para que primero pueda revisar el origen de cada actividad, aporte y pago.</p>
            <div className="finance-grid">
              <article><span>Deuda total generada</span><strong>Bs {formatBs(demoNeighbor.generated)}</strong><small>Multas y aportes registrados</small></article>
              <article><span>Pagos realizados</span><strong>Bs {formatBs(demoNeighbor.paid)}</strong><small>{visitorPayments.length} comprobantes</small></article>
              <article className="balance-card"><span>Deuda total</span><strong>Bs {formatBs(demoBalance)}</strong><small>Saldo pendiente actual</small></article>
            </div>
            <div className="final-debt-total"><span>Deuda total</span><strong>Bs {formatBs(demoBalance)}</strong></div>
            <a className="whatsapp-button" href={`https://wa.me/?text=${encodeURIComponent(`Hola, quisiera consultar mi estado vecinal. Soy ${demoNeighbor.name}, lote ${demoNeighbor.lot}.`)}`} target="_blank" rel="noreferrer">Consultar por WhatsApp →</a>
          </section>
        </main>
      );
    }

    return (
      <main className="neighbor-shell" style={themeStyle}>
        <DemoBar onAdmin={() => openAdmin()} onNeighbor={() => openNeighbor("inicio")} active="vecino" />
        <section className="welcome-panel welcome-cover">
          <header className="cover-topbar">
            <div className="zone-mark" aria-hidden="true">U.V.<br />4-O</div>
            <div><strong>Urbanización Mariscal Santa Cruz</strong><span>Unidad Vecinal U.V. 4-O</span></div>
            <span className="year-pill">Gestión {viewLabels.managementYear}</span>
          </header>
          <div className="cover-title" role="img" aria-label="Vista ilustrativa de la Urbanización Mariscal Santa Cruz U.V. 4-O">
            <span>Control, asistencia y aportes</span>
            <h1>Sistema Vecinal Digital</h1>
            <p>{viewLabels.coverSubtitle}</p>
          </div>
          <section className="resident-identity-card" aria-label="Datos del vecino">
            <div className="resident-main-data">
              <span>Bienvenido(a)</span>
              <h2>{demoNeighbor.name}</h2>
              <p>{demoNeighbor.street}</p>
            </div>
            <div className="lot-feature"><small>Lote</small><strong>{demoNeighbor.lot}</strong></div>
          </section>
          {notice.active && (
            <article className="notice-card">
              <div className="notice-date" aria-hidden="true"><strong>23</strong><span>AGO</span></div>
              <div><p className="notice-label">Próxima actividad</p><h2>{notice.title}</h2><p>{notice.body}</p></div>
              <span className="notice-arrow" aria-hidden="true">→</span>
            </article>
          )}
          <div className="mode-heading"><span>Elige una opción</span><h2>¿Cómo desea revisar su tarjeta?</h2></div>
          <div className="mode-grid" aria-label="Elige cómo ver tu información">
            <button className="mode-card simple-mode" onClick={() => setVisitorView("sencillo")}>
              <span className="mode-icon" aria-hidden="true">✓</span><span><strong>Modo sencillo</strong><small>La tarjeta tradicional por meses</small></span><span className="mode-arrow">→</span>
            </button>
            <button className="mode-card detail-mode" onClick={() => setVisitorView("detallado")}>
              <span className="mode-icon" aria-hidden="true">Bs</span><span><strong>Modo detallado</strong><small>Actividades, pagos y movimientos</small></span><span className="mode-arrow">→</span>
            </button>
          </div>
          <footer className="welcome-footer"><p className="privacy-note"><span aria-hidden="true">●</span> Consulta privada asociada a tu código QR</p><small>Creado por <strong>Ever Vidaurre</strong></small></footer>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-app" style={themeStyle}>
      <DemoBar onAdmin={() => openAdmin(section)} onNeighbor={() => openNeighbor("inicio")} active="admin" />
      <aside className="admin-sidebar">
        <div className="admin-brand"><div className="zone-mark">U.V.<br />4-O</div><div><strong>Sistema Vecinal</strong><span>Mariscal Santa Cruz</span></div></div>
        <nav aria-label="Administración">
          {navItems.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-help"><span>Gestión {viewLabels.managementYear}</span><strong>Todo guardado</strong><small>Último respaldo: hoy</small></div>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar">
          <div><span className="admin-kicker">Panel administrativo</span><h1>{navItems.find((item) => item.id === section)?.label}</h1></div>
          <div className="admin-user"><span>EM</span><div><strong>Presidencia</strong><small>Administrador</small></div></div>
        </header>
        {section === "resumen" && (
          <div className="admin-section">
            <div className="welcome-admin-card"><div><span>Buen día</span><h2>¿Qué desea registrar hoy?</h2><p>Las tareas frecuentes están a un toque. El sistema actualiza automáticamente las tarjetas vecinales.</p></div><div className="admin-date"><strong>18</strong><span>Agosto 2026</span></div></div>
            <div className="quick-actions">
              <button onClick={() => { setSection("vecinos"); setShowNeighborForm(true); }}><span>＋</span><strong>Nuevo vecino</strong><small>Registrar y crear QR</small></button>
              <button onClick={() => { setSection("actividades"); setShowActivityForm(true); }}><span>◇</span><strong>Nueva actividad</strong><small>Reunión, trabajo o cuota</small></button>
              <button onClick={() => setSection("asistencia")}><span>✓</span><strong>Marcar faltas</strong><small>Generar lista de asistencia</small></button>
              <button onClick={() => setSection("pagos")}><span>Bs</span><strong>Registrar pago</strong><small>Parcial o total</small></button>
            </div>
            <div className="summary-grid">
              <SummaryCard label="Vecinos activos" value={String(neighbors.filter((neighbor) => neighbor.active).length)} note="Con QR generado" tone="blue" />
              <SummaryCard label="Actividades" value={String(activities.length)} note="Durante la gestión" tone="violet" />
              <SummaryCard label="Por cobrar" value={`Bs ${formatBs(totalGenerated - totalPaid)}`} note="Saldo pendiente" tone="amber" />
              <SummaryCard label="Recaudado" value={`Bs ${formatBs(totalPaid)}`} note="Pagos registrados" tone="green" />
            </div>
            <section className="admin-panel">
              <div className="panel-heading"><div><span>Seguimiento</span><h2>Vecinos con saldo pendiente</h2></div><button onClick={() => setSection("reportes")}>Ver reporte →</button></div>
              <div className="responsive-table"><table><thead><tr><th>Vecino</th><th>Lote</th><th>Generado</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>
                {neighbors.filter((neighbor) => balanceOf(neighbor) > 0).map((neighbor) => <tr key={neighbor.id}><td><strong>{neighbor.name}</strong><small>{neighbor.code}</small></td><td>{neighbor.lot}</td><td>Bs {formatBs(neighbor.generated)}</td><td>Bs {formatBs(neighbor.paid)}</td><td><span className="debt-pill">Bs {formatBs(balanceOf(neighbor))}</span></td></tr>)}
              </tbody></table></div>
            </section>
          </div>
        )}
        {section === "vecinos" && (
          <div className="admin-section">
            <SectionIntro title="Vecinos registrados" text="Registre una sola vez. El QR y las dos vistas del vecino se preparan automáticamente." action="Registrar vecino" onAction={() => setShowNeighborForm((value) => !value)} />
            {showNeighborForm && <form className="inline-form neighbor-form" onSubmit={addNeighbor}><label>Nombre completo<input name="name" required placeholder="Ej. María Flores" /></label><label>Calle o avenida<input name="street" required placeholder="Ej. Calle Los Pinos" /></label><label>Número de lote<input name="lot" required placeholder="Ej. 705" /></label><label>Teléfono opcional<input name="phone" placeholder="Ej. 70000000" /></label><button type="submit" className="primary-action">Guardar y generar QR</button></form>}
            <section className="admin-panel">
              <div className="panel-heading"><div><span>{neighbors.length} registros</span><h2>Directorio vecinal</h2></div><button className="yellow-action" onClick={downloadQrPdf}>Descargar PDF de QR</button></div>
              <div className="neighbor-cards">
                {neighbors.map((neighbor) => <article className="neighbor-card" key={neighbor.id}><QrTile neighbor={neighbor} /><div><span className={`status-dot ${balanceOf(neighbor) ? "has-debt" : "clear"}`}>{balanceOf(neighbor) ? "Pendiente" : "Al día"}</span><h3>{neighbor.name}</h3><p>{neighbor.street} · Lote {neighbor.lot}</p><p>{neighbor.code}</p><div className="neighbor-actions"><button onClick={() => notify(`Tarjeta de ${neighbor.name} abierta`)}>Ver tarjeta</button><button onClick={() => notify("Edición disponible en la versión final")}>Editar</button><button className="delete-action" onClick={() => deleteNeighbor(neighbor)}>Eliminar</button></div></div></article>)}
              </div>
            </section>
          </div>
        )}
        {section === "actividades" && (
          <div className="admin-section">
            <SectionIntro title="Actividades y cuotas" text="Cree reuniones, trabajos, marchas o aportes. La multa se aplicará únicamente al confirmar las faltas." action="Crear actividad" onAction={() => setShowActivityForm((value) => !value)} />
            {showActivityForm && <form className="inline-form activity-form" onSubmit={addActivity}><label>Tipo<select name="type"><option>Asamblea</option><option>Trabajo</option><option>Marcha / desfile</option><option>Cuota mensual</option><option>Cuota extra</option><option>Otro personalizado</option></select></label><label>Tipo personalizado<input name="customType" placeholder="Ej. Fumigación o seguridad" /></label><label className="wide-field">Nombre<input name="title" required placeholder="Ej. Reunión mensual de septiembre" /></label><label>Fecha<input name="date" type="date" defaultValue="2026-09-10" required /></label><label>Multa Bs<input name="fine" type="number" min="0" defaultValue="50" required /></label><button type="submit" className="primary-action">Guardar actividad</button></form>}
            <div className="activity-list">{activities.map((activity) => <article key={activity.id}><div className="activity-date"><strong>{new Date(`${activity.date}T00:00:00`).getUTCDate()}</strong><span>{new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "UTC" }).format(new Date(`${activity.date}T00:00:00Z`))}</span></div><div className="activity-main"><span>{activity.type} · {activity.code}</span><h3>{activity.title}</h3><p>Multa por inasistencia: <strong>Bs {formatBs(activity.fine)}</strong></p></div><span className={`activity-status ${activity.status === "Cerrada" ? "closed" : "scheduled"}`}>{activity.status}</span><button className="ghost-action" onClick={() => { setSelectedActivity(activity.id); setSection("asistencia"); }}>Asistencia →</button></article>)}</div>
          </div>
        )}
        {section === "asistencia" && (
          <div className="admin-section">
            <SectionIntro title="Marcar asistencia" text="Todos aparecen presentes inicialmente. Cambie solamente a quienes faltaron o fueron justificados." />
            <section className="admin-panel attendance-panel"><div className="attendance-select"><label>Actividad<select value={selectedActivity} onChange={(event) => setSelectedActivity(Number(event.target.value))}>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.code} · {activity.title}</option>)}</select></label><div><span>Multa configurada</span><strong>Bs {formatBs(selectedActivityData.fine)}</strong></div></div>
              <div className="attendance-list">{neighbors.map((neighbor) => <article key={neighbor.id}><div className="avatar">{neighbor.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div className="attendance-name"><strong>{neighbor.name}</strong><span>Lote {neighbor.lot} · {neighbor.code}</span></div><div className="attendance-buttons">{(["Presente", "Faltó", "Justificado"] as AttendanceStatus[]).map((status) => <button key={status} className={attendance[neighbor.id] === status ? `selected ${status.toLowerCase().replace("ó", "o")}` : ""} onClick={() => setAttendance((current) => ({ ...current, [neighbor.id]: status }))}>{status}</button>)}</div></article>)}</div>
              <div className="attendance-footer"><p><strong>{Object.values(attendance).filter((status) => status === "Faltó").length} faltas</strong> · Revise antes de confirmar.</p><button className="primary-action" onClick={saveAttendance}>Guardar asistencia</button></div>
            </section>
          </div>
        )}
        {section === "pagos" && (
          <div className="admin-section">
            <SectionIntro title="Registrar pago" text="Busque al vecino, revise su saldo y registre un pago parcial o total. Se generará un comprobante." />
            <form className="payment-form" onSubmit={registerPayment}><label>Vecino<select name="neighbor" required>{neighbors.map((neighbor) => <option key={neighbor.id} value={neighbor.id}>{neighbor.code} · {neighbor.name} · Lote {neighbor.lot} · Saldo Bs {formatBs(balanceOf(neighbor))}</option>)}</select></label><label>Fecha<input name="date" type="date" defaultValue="2026-08-18" required /></label><label>Monto Bs<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" /></label><label className="full-field">Observación<input name="note" placeholder="Ej. Pago parcial de deuda" /></label><button className="primary-action" type="submit">Guardar pago</button></form>
            <section className="admin-panel"><div className="panel-heading"><div><span>{payments.length} registros</span><h2>Pagos recientes</h2></div></div><div className="responsive-table"><table><thead><tr><th>Fecha</th><th>Vecino</th><th>Comprobante</th><th>Observación</th><th>Monto</th></tr></thead><tbody>{payments.map((payment) => { const neighbor = neighbors.find((item) => item.id === payment.neighborId); return <tr key={payment.id}><td>{formatDate(payment.date)}</td><td><strong>{neighbor?.name}</strong><small>Lote {neighbor?.lot}</small></td><td>{payment.receipt}</td><td>{payment.note}</td><td><span className="paid-pill">Bs {formatBs(payment.amount)}</span></td></tr>; })}</tbody></table></div></section>
          </div>
        )}
        {section === "vistas" && (
          <div className="admin-section">
            <SectionIntro title="Personalizar vistas del vecino" text="Cambie los cuadros y textos desde este panel. La modificación se refleja inmediatamente en el modo sencillo y en el modo detallado." />
            <div className="view-editor-tabs" role="tablist" aria-label="Vista que desea modificar">
              <button className={viewEditorMode === "sencillo" ? "active" : ""} onClick={() => setViewEditorMode("sencillo")}>Modo sencillo</button>
              <button className={viewEditorMode === "detallado" ? "active" : ""} onClick={() => setViewEditorMode("detallado")}>Modo detallado</button>
              <button className={viewEditorMode === "apariencia" ? "active" : ""} onClick={() => setViewEditorMode("apariencia")}>Colores y textos</button>
            </div>
            {viewEditorMode === "sencillo" ? (
              <section className="admin-panel view-editor-panel">
                <div className="panel-heading"><div><span>Tarjeta virtual</span><h2>Modificar un cuadro</h2></div><button onClick={() => openNeighbor("sencillo")}>Ver modo sencillo →</button></div>
                <p className="editor-help">Seleccione la categoría y el mes. Use ✓ cuando cumplió o pagó, × cuando faltó o no pagó, y deje vacío cuando no hubo actividad.</p>
                <div className="editor-selectors">
                  <label>Categoría<select value={selectedCardCategory} onChange={(event) => setSelectedCardCategory(Number(event.target.value))}>{cardData.map((row, index) => <option key={row.label} value={index}>{row.label}</option>)}</select></label>
                  <label>Mes<select value={selectedCardMonth} onChange={(event) => setSelectedCardMonth(Number(event.target.value))}>{fullMonthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></label>
                </div>
                <form className="view-editor-form" key={`${selectedCardCategory}-${selectedCardMonth}-${selectedCardStatus}-${selectedCardDetail}`} onSubmit={updateCardCell}>
                  <label>Resultado<select name="status" defaultValue={selectedCardStatus}><option value="done">✓ Cumplió / pagó</option><option value="pending">× Faltó / no pagó</option><option value="empty">Sin actividad</option></select></label>
                  <label>Texto debajo del símbolo<input name="detail" defaultValue={selectedCardDetail} placeholder="Ej. Limpieza, luminarias o cuota mensual" /></label>
                  <button className="primary-action" type="submit">Guardar cambio</button>
                </form>
                <div className={`editor-cell-preview ${selectedCardStatus}`}><span>{fullMonthNames[selectedCardMonth]}</span><b>{selectedCardStatus === "done" ? "✓" : selectedCardStatus === "pending" ? "×" : ""}</b>{selectedCardStatus !== "empty" && selectedCardDetail && <small>{selectedCardDetail}</small>}</div>
              </section>
            ) : viewEditorMode === "detallado" ? (
              <section className="admin-panel view-editor-panel">
                <div className="panel-heading"><div><span>Vista explicada</span><h2>Modificar introducción</h2></div><button onClick={() => openNeighbor("detallado")}>Ver modo detallado →</button></div>
                <p className="editor-help">Los cuadros modificados arriba también aparecen automáticamente en el modo detallado. Aquí puede cambiar su texto de explicación.</p>
                <form className="detailed-editor-form" onSubmit={updateDetailedIntro}>
                  <label>Texto introductorio<textarea name="detailedIntro" defaultValue={detailedIntro} rows={5} required /></label>
                  <button className="primary-action" type="submit">Guardar texto</button>
                </form>
              </section>
            ) : (
              <div className="appearance-editor-grid">
                <section className="admin-panel view-editor-panel">
                  <div className="panel-heading"><div><span>Personalización</span><h2>Colores generales</h2></div><button onClick={() => openNeighbor("inicio")}>Ver portada →</button></div>
                  <p className="editor-help">Los cambios se muestran inmediatamente en la portada, las dos vistas y el panel administrativo.</p>
                  <form className="theme-editor-form" onSubmit={saveTheme}>
                    <div className="color-fields">
                      <label>Color principal<span><input type="color" value={themeSettings.primary} onChange={(event) => setThemeColor("primary", event.target.value)} /><b>{themeSettings.primary}</b></span></label>
                      <label>Color secundario<span><input type="color" value={themeSettings.secondary} onChange={(event) => setThemeColor("secondary", event.target.value)} /><b>{themeSettings.secondary}</b></span></label>
                      <label>Pagado / asistencia<span><input type="color" value={themeSettings.success} onChange={(event) => setThemeColor("success", event.target.value)} /><b>{themeSettings.success}</b></span></label>
                      <label>Falta / pendiente<span><input type="color" value={themeSettings.danger} onChange={(event) => setThemeColor("danger", event.target.value)} /><b>{themeSettings.danger}</b></span></label>
                      <label>Botones destacados<span><input type="color" value={themeSettings.accent} onChange={(event) => setThemeColor("accent", event.target.value)} /><b>{themeSettings.accent}</b></span></label>
                      <label>Fondo general<span><input type="color" value={themeSettings.background} onChange={(event) => setThemeColor("background", event.target.value)} /><b>{themeSettings.background}</b></span></label>
                      <label>Color de tarjeta<span><input type="color" value={themeSettings.paper} onChange={(event) => setThemeColor("paper", event.target.value)} /><b>{themeSettings.paper}</b></span></label>
                    </div>
                    <div className="appearance-actions"><button className="primary-action" type="submit">Aplicar colores</button><button type="button" className="reset-appearance" onClick={() => { setThemeSettings(defaultTheme); notify("Colores originales restaurados"); }}>Restaurar colores</button></div>
                  </form>
                </section>
                <section className="admin-panel view-editor-panel">
                  <div className="panel-heading"><div><span>Contenido</span><h2>Textos generales</h2></div></div>
                  <form className="labels-editor-form" key={Object.values(viewLabels).join("-")} onSubmit={updateViewLabels}>
                    <label>Gestión<input name="managementYear" defaultValue={viewLabels.managementYear} required /></label>
                    <label>Título del modo sencillo<input name="simpleTitle" defaultValue={viewLabels.simpleTitle} required /></label>
                    <label>Título del modo detallado<input name="detailedTitle" defaultValue={viewLabels.detailedTitle} required /></label>
                    <label>Texto de la portada<textarea name="coverSubtitle" defaultValue={viewLabels.coverSubtitle} rows={3} required /></label>
                    <div className="appearance-actions"><button className="primary-action" type="submit">Guardar textos</button><button type="button" className="reset-appearance" onClick={() => { setViewLabels(defaultViewLabels); notify("Textos originales restaurados"); }}>Restaurar textos</button></div>
                  </form>
                </section>
              </div>
            )}
          </div>
        )}
        {section === "avisos" && (
          <div className="admin-section">
            <SectionIntro title="Avisos para los vecinos" text="Publique un anuncio con fotografía. Aparecerá en la bienvenida y dentro de ambos modos." />
            <div className="notice-admin-grid"><form className="notice-form" onSubmit={publishNotice}><label>Título<input name="title" defaultValue={notice.title} required /></label><label>Mensaje<textarea name="body" defaultValue={notice.body} rows={4} required /></label><label>Fotografía<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setNotice((current) => ({ ...current, image: URL.createObjectURL(file) })); }} /></label><div className="form-two-cols"><label>Mostrar desde<input type="date" defaultValue="2026-08-18" /></label><label>Hasta<input type="date" defaultValue="2026-08-24" /></label></div><button className="primary-action" type="submit">Publicar aviso</button></form><article className="notice-preview"><span>Vista previa del vecino</span><div className="notice-photo" style={notice.image ? { backgroundImage: `url(${notice.image})` } : undefined}>{!notice.image && <><strong>U.V. 4-O</strong><small>Fotografía del aviso</small></>}</div><div><b>Próxima actividad</b><h3>{notice.title}</h3><p>{notice.body}</p></div></article></div>
          </div>
        )}
        {section === "reportes" && (
          <div className="admin-section">
            <SectionIntro title="Reportes y respaldos" text="Descargue documentos listos para imprimir y copias editables para su archivo mensual." />
            <div className="report-grid"><article className="report-card featured"><span>QR</span><h2>Todos los QR de vecinos</h2><p>PDF A4 con seis tarjetas por página, nombre, lote y líneas de corte.</p><button className="yellow-action" onClick={downloadQrPdf}>Descargar PDF de QR</button></article><article className="report-card"><span>CSV</span><h2>Reporte de deudores</h2><p>Listado actualizado de vecinos con saldo pendiente.</p><button onClick={downloadDebtorsCsv}>Descargar deudores</button></article><article className="report-card"><span>PDF</span><h2>Resumen mensual</h2><p>Actividades, multas generadas y pagos de agosto.</p><button onClick={() => notify("Resumen mensual preparado para la versión final")}>Generar resumen</button></article><article className="report-card"><span>↺</span><h2>Respaldo completo</h2><p>Copia de vecinos, actividades, asistencias, pagos y avisos.</p><button onClick={() => notify("Respaldo de demostración preparado")}>Descargar respaldo</button></article></div>
            <div className="backup-status"><div className="backup-check">✓</div><div><strong>Datos protegidos</strong><p>Último respaldo de demostración: hoy, 16:30</p></div><span>Gestión 2026</span></div>
          </div>
        )}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function DemoBar({ onAdmin, onNeighbor, active }: { onAdmin: () => void; onNeighbor: () => void; active: "vecino" | "admin" }) {
  return <div className="demo-bar"><span>Prototipo de demostración</span><div><button className={active === "vecino" ? "active" : ""} onClick={onNeighbor}>Vista vecino</button><button className={active === "admin" ? "active" : ""} onClick={onAdmin}>Panel administrativo</button></div></div>;
}

function MiniNotice({ notice }: { notice: { title: string; body: string; image: string } }) {
  return <article className="mini-notice">{notice.image ? <div className="mini-notice-photo" style={{ backgroundImage: `url(${notice.image})` }} /> : <div className="mini-notice-mark">!</div>}<div><span>Aviso vecinal</span><strong>{notice.title}</strong><p>{notice.body}</p></div></article>;
}

function TimelineItem({ date, title, meta, amount, tone }: { date: string; title: string; meta: string; amount: string; tone: "red" | "green" }) {
  return <div className="timeline-item"><div className="timeline-date">{date}</div><div><strong>{title}</strong><span>{meta}</span></div><b className={tone}>{amount}</b></div>;
}

function SummaryCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article className={`summary-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function SectionIntro({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="section-intro"><div><span>Sistema Vecinal Digital</span><h2>{title}</h2><p>{text}</p></div>{action && <button className="primary-action" onClick={onAction}>＋ {action}</button>}</div>;
}

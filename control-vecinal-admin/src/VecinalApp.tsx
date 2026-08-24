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
  cardRowIndex: number;
  cardSlotIndex: number;
};

type DebtItem = { concept: string; detail: string; date: string; amount: number };
type ActivityCharge = DebtItem & { neighborId: number; activityId: number };

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
  cellLabels: string[];
  details: string[];
};
type ViewEditorMode = "tarjeta" | "apariencia";
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
type Notice = {
  title: string;
  body: string;
  active: boolean;
  image: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  eventPlace: string;
  whatsapp: string;
};
type CardSelection = { rowIndex: number; monthIndex: number } | null;

type AttendanceRecord = {
  id: number;
  activityId: number;
  neighborId: number;
  status: AttendanceStatus;
  charge: number;
  note: string;
};

type AdminState = {
  neighbors: Neighbor[];
  activities: Activity[];
  attendance: AttendanceRecord[];
  payments: Payment[];
  notice: null | {
    title: string;
    body: string;
    active: boolean;
    imageUrl: string;
    eventType: string;
    eventDate: string;
    eventTime: string;
    eventPlace: string;
    whatsapp: string;
  };
  settings: null | {
    managementYear: string;
    theme: Partial<ThemeSettings>;
    labels: Partial<ViewLabels>;
  };
};

type PublicNeighborState = {
  neighbor: Pick<Neighbor, "id" | "code" | "name" | "street" | "lot">;
  cardEntries: Array<{
    id: number;
    type: string;
    title: string;
    date: string;
    amount: number;
    status: AttendanceStatus | "Programada";
    charge: number;
    cardRowIndex: number;
    cardSlotIndex: number;
  }>;
  payments: Array<Omit<Payment, "neighborId">>;
  totals: { generated: number; paid: number; balance: number };
  notice: AdminState["notice"];
  settings: AdminState["settings"];
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
  { id: 1, code: "ACT-001", type: "Asamblea", title: "Reunión mensual de agosto", date: "2026-08-23", fine: 50, status: "Programada", cardRowIndex: 0, cardSlotIndex: 7 },
  { id: 2, code: "ACT-002", type: "Trabajo", title: "Limpieza de áreas comunes", date: "2026-07-12", fine: 80, status: "Cerrada", cardRowIndex: 4, cardSlotIndex: 0 },
  { id: 3, code: "ACT-003", type: "Marcha / desfile", title: "Desfile cívico vecinal", date: "2026-08-06", fine: 60, status: "Cerrada", cardRowIndex: 3, cardSlotIndex: 0 },
];

const initialPayments: Payment[] = [
  { id: 1, neighborId: 1, date: "2026-08-02", amount: 50, note: "Pago de cuota y multa", receipt: "REC-0001" },
  { id: 2, neighborId: 1, date: "2026-06-15", amount: 70, note: "Pago parcial", receipt: "REC-0002" },
  { id: 3, neighborId: 3, date: "2026-07-20", amount: 90, note: "Pago total", receipt: "REC-0003" },
];

const standardActivityTypes = ["Asamblea", "Trabajo", "Marcha / desfile", "Cuota mensual", "Cuota extra"];

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const blankDetails = Array(12).fill("");
const blankWorkDetails = Array(24).fill("");
const cardRows: CardRow[] = [
  {
    label: "Asambleas",
    kind: "attendance",
    values: ["done", "done", "done", "done", "done", "done", "done", "pending", "empty", "empty", "empty", "empty"],
    cellLabels: [...blankDetails],
    details: ["Asamblea general", "Reunión mensual", "Reunión mensual", "Asamblea general", "Reunión mensual", "Reunión mensual", "Asamblea general", "Reunión mensual · multa Bs 50", ...blankDetails.slice(0, 4)],
  },
  {
    label: "Cuotas mensuales",
    kind: "contribution",
    values: Array(12).fill("empty") as CardStatus[],
    cellLabels: [...blankDetails],
    details: [...blankDetails],
  },
  {
    label: "Cuotas extras",
    kind: "contribution",
    values: Array(12).fill("empty") as CardStatus[],
    cellLabels: [...blankDetails],
    details: [...blankDetails],
  },
  {
    label: "Otros",
    kind: "attendance",
    values: ["done", ...Array(11).fill("empty")] as CardStatus[],
    cellLabels: ["Desfile cívico", ...blankDetails.slice(1)],
    details: ["Desfile cívico vecinal · 6 de agosto de 2026", ...blankDetails.slice(1)],
  },
  {
    label: "Trabajos",
    kind: "attendance",
    values: ["done", ...Array(23).fill("empty")] as CardStatus[],
    cellLabels: ["Limpieza", ...blankWorkDetails.slice(1)],
    details: ["Limpieza de áreas comunes · 12 de julio de 2026", ...blankWorkDetails.slice(1)],
  },
];

const demoDebtItems = [
  { concept: "Multa por inasistencia", detail: "Reunión mensual de agosto", date: "23 de agosto de 2026", amount: 35 },
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

function shortCardLabel(type: string, title: string, amount: number) {
  const normalized = type.toLocaleLowerCase("es");
  if (normalized.includes("cuota") || normalized.includes("aporte")) return `${formatBs(amount)} Bs`;
  return title.slice(0, 18);
}

function emptyCardRows() {
  return cardRows.map((row) => ({
    ...row,
    values: Array(row.values.length).fill("empty") as CardStatus[],
    cellLabels: Array(row.values.length).fill("") as string[],
    details: Array(row.values.length).fill("") as string[],
  }));
}

function cardRowsFromRecords(activities: Activity[], attendance: AttendanceRecord[], neighborId: number) {
  const rows = emptyCardRows();
  const attendanceByActivity = new Map(attendance.filter((record) => record.neighborId === neighborId).map((record) => [record.activityId, record]));
  for (const activity of activities) {
    const row = rows[activity.cardRowIndex];
    if (!row || activity.cardSlotIndex < 0 || activity.cardSlotIndex >= row.values.length) continue;
    const record = attendanceByActivity.get(activity.id);
    row.values[activity.cardSlotIndex] = !record ? "empty" : record.status === "Faltó" ? "pending" : "done";
    row.cellLabels[activity.cardSlotIndex] = shortCardLabel(activity.type, activity.title, activity.fine);
    row.details[activity.cardSlotIndex] = `${activity.title} · ${formatDate(activity.date)}${record ? ` · ${record.status}` : " · Programada"}${record?.charge ? ` · Multa Bs ${formatBs(record.charge)}` : ""}`;
  }
  return rows;
}

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación");
  return data;
}

function QrTile({ neighbor }: { neighbor: Neighbor }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    const publicUrl = `${window.location.origin}/?token=${encodeURIComponent(neighbor.token)}`;
    import("qrcode").then((QRCode) => QRCode.toDataURL(publicUrl, {
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
  const [area, setArea] = useState<"vecino" | "admin">("admin");
  const [visitorView, setVisitorView] = useState<VisitorView>("sencillo");
  const [section, setSection] = useState<AdminSection>("resumen");
  const [neighbors, setNeighbors] = useState(initialNeighbors);
  const [activities, setActivities] = useState(initialActivities);
  const [payments, setPayments] = useState(initialPayments);
  const [cardData, setCardData] = useState<CardRow[]>(cardRows);
  const [viewEditorMode, setViewEditorMode] = useState<ViewEditorMode>("tarjeta");
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultTheme);
  const [viewLabels, setViewLabels] = useState<ViewLabels>(defaultViewLabels);
  const [selectedCardCategory, setSelectedCardCategory] = useState(0);
  const [selectedCardMonth, setSelectedCardMonth] = useState(0);
  const [selectedCardCell, setSelectedCardCell] = useState<CardSelection>(null);
  const [detailedIntro] = useState("Revise los doce meses y toque cualquier símbolo verde o rojo para abrir la explicación exacta del registro.");
  const [showNeighborForm, setShowNeighborForm] = useState(false);
  const [editingNeighborId, setEditingNeighborId] = useState<number | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>({
    title: "Asamblea general de vecinos",
    body: "Revisaremos seguridad, luminarias y trabajos comunitarios de la zona.",
    active: true,
    image: "",
    eventType: "Asamblea general",
    eventDate: "2026-08-23",
    eventTime: "19:00",
    eventPlace: "Sede vecinal",
    whatsapp: "",
  });
  const [selectedActivity, setSelectedActivity] = useState(activities[0].id);
  const [attendanceByActivity, setAttendanceByActivity] = useState<Record<number, Record<number, AttendanceStatus>>>(
    Object.fromEntries(initialActivities.map((activity) => [activity.id, Object.fromEntries(initialNeighbors.map((neighbor) => [neighbor.id, "Presente"]))]))
  );
  const [activityCharges, setActivityCharges] = useState<ActivityCharge[]>([]);
  const [toast, setToast] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [isPublicRecord, setIsPublicRecord] = useState(false);

  const demoNeighbor = neighbors[0] ?? { id: 0, code: "", token: "", name: "SIN VECINO REGISTRADO", street: "", lot: "—", phone: "", generated: 0, paid: 0, active: false };
  const demoBalance = balanceOf(demoNeighbor);
  const today = new Date().toISOString().slice(0, 10);
  const totalGenerated = neighbors.reduce((total, neighbor) => total + neighbor.generated, 0);
  const totalPaid = neighbors.reduce((total, neighbor) => total + neighbor.paid, 0);
  const selectedActivityData = activities.find((activity) => activity.id === selectedActivity) ?? activities[0];
  const editingActivity = editingActivityId === null ? null : activities.find((activity) => activity.id === editingActivityId) ?? null;
  const editingNeighbor = editingNeighborId === null ? null : neighbors.find((neighbor) => neighbor.id === editingNeighborId) ?? null;
  const editingActivityType = !editingActivity ? "Asamblea" : standardActivityTypes.includes(editingActivity.type) ? editingActivity.type : "Otro personalizado";
  const editingCustomType = editingActivity && !standardActivityTypes.includes(editingActivity.type) ? editingActivity.type : "";
  const selectedAttendance = attendanceByActivity[selectedActivity] ?? {};
  const selectedCardRow = cardData[selectedCardCategory] ?? cardData[0];
  const selectedCardStatus = selectedCardRow.values[selectedCardMonth] ?? "empty";
  const selectedCardLabel = selectedCardRow.cellLabels[selectedCardMonth] ?? "";
  const selectedCardDetail = selectedCardRow.details[selectedCardMonth] ?? "";
  const selectedCellRow = selectedCardCell ? cardData[selectedCardCell.rowIndex] : null;
  const selectedCellStatus = selectedCardCell && selectedCellRow ? selectedCellRow.values[selectedCardCell.monthIndex] : "empty";
  const whatsappMessage = `Hola, quisiera consultar mi estado vecinal. Soy ${demoNeighbor.name}, lote ${demoNeighbor.lot}.`;
  const whatsappNumber = notice.whatsapp.replace(/\D/g, "");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
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
  const visitorDebtItems = useMemo<DebtItem[]>(
    () => [...(isPublicRecord ? [] : demoDebtItems), ...activityCharges.filter((charge) => charge.neighborId === demoNeighbor.id)],
    [activityCharges, demoNeighbor.id, isPublicRecord]
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function applyNotice(nextNotice: AdminState["notice"]) {
    if (!nextNotice) return;
    setNotice({
      title: nextNotice.title,
      body: nextNotice.body,
      active: nextNotice.active,
      image: nextNotice.imageUrl,
      eventType: nextNotice.eventType,
      eventDate: nextNotice.eventDate,
      eventTime: nextNotice.eventTime,
      eventPlace: nextNotice.eventPlace,
      whatsapp: nextNotice.whatsapp,
    });
  }

  function applySettings(settings: AdminState["settings"]) {
    if (!settings) return;
    setThemeSettings((current) => ({ ...current, ...settings.theme }));
    setViewLabels((current) => ({ ...current, ...settings.labels, managementYear: settings.managementYear || current.managementYear }));
  }

  async function loadAdminState(showProgress = true) {
    if (showProgress) setAdminLoading(true);
    setAdminError("");
    try {
      const state = await apiRequest<AdminState>("/api/admin/state", { cache: "no-store" });
      setNeighbors(state.neighbors);
      setIsPublicRecord(true);
      setActivities(state.activities);
      setPayments(state.payments);
      const recordsByActivity: Record<number, Record<number, AttendanceStatus>> = {};
      for (const activity of state.activities) {
        recordsByActivity[activity.id] = Object.fromEntries(state.neighbors.map((neighbor) => [neighbor.id, "Presente" as AttendanceStatus]));
      }
      for (const record of state.attendance) {
        recordsByActivity[record.activityId] = { ...(recordsByActivity[record.activityId] ?? {}), [record.neighborId]: record.status };
      }
      setAttendanceByActivity(recordsByActivity);
      setActivityCharges(state.attendance.flatMap<ActivityCharge>((record) => {
        if (!record.charge) return [];
        const activity = state.activities.find((item) => item.id === record.activityId);
        if (!activity) return [];
        return [{
          neighborId: record.neighborId,
          activityId: record.activityId,
          concept: `Multa · ${activity.type}`,
          detail: activity.title,
          date: formatDate(activity.date),
          amount: record.charge,
        }];
      }));
      const firstActivityId = state.activities[0]?.id ?? 0;
      setSelectedActivity((current) => state.activities.some((activity) => activity.id === current) ? current : firstActivityId);
      if (state.neighbors[0]) setCardData(cardRowsFromRecords(state.activities, state.attendance, state.neighbors[0].id));
      else setCardData(emptyCardRows());
      applyNotice(state.notice);
      applySettings(state.settings);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "No se pudo cargar la base de datos");
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    setArea("admin");
  }, []);

  useEffect(() => {
    if (!selectedCardCell) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCardCell(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedCardCell]);

  useEffect(() => {
    setArea("admin");
  }, []);

  useEffect(() => {
    if (area !== "admin") return;
    const timer = window.setTimeout(() => void loadAdminState(), 0);
    return () => window.clearTimeout(timer);
    // loadAdminState reads and replaces the complete server snapshot when the area changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area]);

  function openAdmin(target: AdminSection = "resumen") {
    setSection(target);
    setArea("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNeighbor() {
    window.location.assign("https://control-vecinal.mariscalsantacruz-4o.workers.dev/");
  }

  async function addNeighbor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const street = String(form.get("street") ?? "").trim();
    const lot = String(form.get("lot") ?? "").trim();
    if (!name || !street || !lot) return;
    try {
      await apiRequest("/api/admin/neighbors", {
        method: editingNeighbor ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingNeighbor?.id, name, street, lot, phone: String(form.get("phone") ?? "") }),
      });
      await loadAdminState(false);
      setEditingNeighborId(null);
      setShowNeighborForm(false);
      event.currentTarget.reset();
      notify(editingNeighbor ? "Datos del vecino corregidos" : "Vecino registrado y QR generado");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar el vecino");
    }
  }

  async function deleteNeighbor(neighbor: Neighbor) {
    const confirmed = window.confirm(
      `¿Eliminar a ${neighbor.name}, lote ${neighbor.lot}?\n\nTambién se eliminarán sus asistencias y pagos. Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/api/admin/neighbors?id=${neighbor.id}`, { method: "DELETE" });
      await loadAdminState(false);
      notify(`${neighbor.name} fue eliminado`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo eliminar el vecino");
    }
  }

  function updateCardCell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") ?? "empty") as CardStatus;
    const cellLabel = String(form.get("cellLabel") ?? "").trim().slice(0, 18);
    const detail = String(form.get("detail") ?? "").trim();
    setCardData((current) => current.map((row, rowIndex) => {
      if (rowIndex !== selectedCardCategory) return row;
      const values = [...row.values];
      const cellLabels = [...row.cellLabels];
      const details = [...row.details];
      values[selectedCardMonth] = status;
      cellLabels[selectedCardMonth] = cellLabel;
      details[selectedCardMonth] = detail;
      return { ...row, values, cellLabels, details };
    }));
    notify("Cuadro actualizado en la tarjeta del vecino");
  }

  async function persistSettings(nextTheme: ThemeSettings, nextLabels: ViewLabels) {
    await apiRequest("/api/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ managementYear: nextLabels.managementYear, theme: nextTheme, labels: nextLabels }),
    });
  }

  async function updateViewLabels(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextLabels = {
      managementYear: String(form.get("managementYear") ?? viewLabels.managementYear).trim(),
      simpleTitle: String(form.get("simpleTitle") ?? viewLabels.simpleTitle).trim(),
      detailedTitle: String(form.get("detailedTitle") ?? viewLabels.detailedTitle).trim(),
      coverSubtitle: String(form.get("coverSubtitle") ?? viewLabels.coverSubtitle).trim(),
    };
    try {
      await persistSettings(themeSettings, nextLabels);
      setViewLabels(nextLabels);
      notify("Textos generales actualizados");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron guardar los textos");
    }
  }

  async function saveTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await persistSettings(themeSettings, viewLabels);
      notify("Colores actualizados en todo el sistema");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron guardar los colores");
    }
  }

  function setThemeColor(key: keyof ThemeSettings, value: string) {
    setThemeSettings((current) => ({ ...current, [key]: value }));
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const customType = String(form.get("customType") ?? "").trim();
    if (!title) return;
    const type = customType || String(form.get("type") ?? "Asamblea");
    const date = String(form.get("date") ?? "2026-08-23");
    const fine = Math.max(0, Number(form.get("fine") ?? 0));
    try {
      const result = await apiRequest<{ activity: Activity }>("/api/admin/activities", {
        method: editingActivity ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingActivity?.id, type, title, date, fine }),
      });
      await loadAdminState(false);
      setSelectedActivity(result.activity.id);
      setEditingActivityId(null);
      setShowActivityForm(false);
      event.currentTarget.reset();
      notify(editingActivity ? "Actividad corregida y deuda recalculada" : "Actividad creada y añadida a la tarjeta");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar la actividad");
    }
  }

  async function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const neighborId = Number(form.get("neighbor"));
    const amount = Number(form.get("amount"));
    if (!neighborId || amount <= 0) return;
    const neighbor = neighbors.find((item) => item.id === neighborId);
    if (!neighbor) return;
    const currentBalance = balanceOf(neighbor);
    if (currentBalance <= 0) {
      notify("El vecino no tiene una deuda pendiente");
      return;
    }
    if (amount > currentBalance) {
      notify(`El pago no puede superar el saldo de Bs ${formatBs(currentBalance)}`);
      return;
    }
    try {
      const result = await apiRequest<{ payment: Payment }>("/api/admin/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          neighborId,
          amount,
          date: String(form.get("date") ?? new Date().toISOString().slice(0, 10)),
          note: String(form.get("note") ?? "Pago de deuda"),
        }),
      });
      await loadAdminState(false);
      event.currentTarget.reset();
      notify(`Pago registrado · ${result.payment.receipt}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo registrar el pago");
    }
  }

  async function publishNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextNotice = {
      ...notice,
      title: String(form.get("title") ?? notice.title),
      body: String(form.get("body") ?? notice.body),
      eventType: String(form.get("eventType") ?? notice.eventType),
      eventDate: String(form.get("eventDate") ?? notice.eventDate),
      eventTime: String(form.get("eventTime") ?? notice.eventTime),
      eventPlace: String(form.get("eventPlace") ?? notice.eventPlace),
      whatsapp: String(form.get("whatsapp") ?? notice.whatsapp),
      active: true,
    };
    try {
      await apiRequest("/api/admin/notice", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...nextNotice, imageUrl: nextNotice.image }),
      });
      setNotice(nextNotice);
      notify("Aviso publicado en la vista del vecino");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo publicar el aviso");
    }
  }

  async function saveAttendance() {
    if (!selectedActivityData) {
      notify("Primero cree una actividad");
      return;
    }
    const currentRecords = attendanceByActivity[selectedActivity] ?? {};
    try {
      const result = await apiRequest<{ absentCount: number; generated: number }>("/api/admin/attendance", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          activityId: selectedActivity,
          records: neighbors.filter((neighbor) => neighbor.active).map((neighbor) => ({
            neighborId: neighbor.id,
            status: currentRecords[neighbor.id] ?? "Presente",
            note: "",
          })),
        }),
      });
      await loadAdminState(false);
      notify(result.absentCount ? `${result.absentCount} falta(s) guardada(s) · deuda Bs ${formatBs(result.generated)}` : "Asistencia guardada sin faltas");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar la asistencia");
    }
  }

  async function downloadQrPdf() {
    notify("Preparando PDF con todos los QR…");
    const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
    const activeNeighbors = neighbors.filter((neighbor) => neighbor.active);
    const cardWidth = 35;
    const cardHeight = 30;
    const columns = 5;
    const rows = 8;
    const cardsPerPage = columns * rows;
    const gapX = 3;
    const gapY = 2;
    const startX = 14.45;
    const startY = 12.7;
    const publicBaseUrl = `${window.location.origin}/`;
    for (let index = 0; index < activeNeighbors.length; index += 1) {
      const neighbor = activeNeighbors[index];
      if (index > 0 && index % cardsPerPage === 0) doc.addPage();
      const slot = index % cardsPerPage;
      const column = slot % columns;
      const row = Math.floor(slot / columns);
      const x = startX + column * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const qr = await QRCode.toDataURL(`${publicBaseUrl}?token=${encodeURIComponent(neighbor.token)}`, { width: 500, margin: 1 });
      doc.setDrawColor(77, 101, 130);
      doc.setLineWidth(0.25);
      doc.rect(x, y, cardWidth, cardHeight);
      doc.addImage(qr, "PNG", x + 8.25, y + 1.2, 18.5, 18.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.4);
      doc.text(neighbor.name.toUpperCase(), x + cardWidth / 2, y + 22.3, { align: "center", maxWidth: 32 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.8);
      doc.text(`LOTE ${neighbor.lot}`, x + cardWidth / 2, y + 28, { align: "center" });
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

  async function downloadMonthlySummary() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
    const month = new Date().getMonth() + 1;
    const year = Number(viewLabels.managementYear) || new Date().getFullYear();
    const monthlyActivities = activities.filter((activity) => Number(activity.date.slice(0, 4)) === year && Number(activity.date.slice(5, 7)) === month);
    const monthlyPayments = payments.filter((payment) => Number(payment.date.slice(0, 4)) === year && Number(payment.date.slice(5, 7)) === month);
    const monthLabel = new Intl.DateTimeFormat("es-BO", { month: "long" }).format(new Date(Date.UTC(year, month - 1, 1))).toUpperCase();
    doc.setTextColor(16, 42, 82);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SISTEMA VECINAL DIGITAL", 20, 22);
    doc.setFontSize(11);
    doc.text(`RESUMEN MENSUAL · ${monthLabel} ${year}`, 20, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Vecinos activos: ${neighbors.filter((neighbor) => neighbor.active).length}`, 20, 41);
    doc.text(`Saldo total pendiente: Bs ${formatBs(totalGenerated - totalPaid)}`, 20, 47);
    doc.text(`Total recaudado acumulado: Bs ${formatBs(totalPaid)}`, 20, 53);
    let y = 66;
    doc.setFont("helvetica", "bold");
    doc.text("ACTIVIDADES DEL MES", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    for (const activity of monthlyActivities) {
      doc.text(`${formatDate(activity.date)} · ${activity.type} · ${activity.title} · Bs ${formatBs(activity.fine)}`, 20, y, { maxWidth: 175 });
      y += 7;
      if (y > 245) { doc.addPage(); y = 22; }
    }
    if (!monthlyActivities.length) { doc.text("No se registraron actividades en este mes.", 20, y); y += 8; }
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.text("PAGOS DEL MES", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    for (const payment of monthlyPayments) {
      const neighbor = neighbors.find((item) => item.id === payment.neighborId);
      doc.text(`${formatDate(payment.date)} · ${neighbor?.name ?? "Vecino"} · ${payment.receipt} · Bs ${formatBs(payment.amount)}`, 20, y, { maxWidth: 175 });
      y += 7;
      if (y > 245) { doc.addPage(); y = 22; }
    }
    if (!monthlyPayments.length) doc.text("No se registraron pagos en este mes.", 20, y);
    doc.save(`RESUMEN_${monthLabel}_${year}_UV_4-O.pdf`);
    notify("Resumen mensual descargado");
  }

  function downloadFullBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      system: "Sistema Vecinal Digital · U.V. 4-O",
      neighbors,
      activities,
      attendance: attendanceByActivity,
      payments,
      notice,
      settings: { theme: themeSettings, labels: viewLabels },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `RESPALDO_SISTEMA_VECINAL_${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Respaldo completo descargado");
  }

  if (area === "vecino") {
    if (visitorView === "sencillo") {
      return (
        <main className="visitor-page card-page" id="modo-sencillo" style={themeStyle}>
          {adminLoading && <div className="public-data-status">Abriendo su tarjeta vecinal…</div>}
          {adminError && <div className="public-data-status error"><strong>No pudimos abrir esta tarjeta.</strong><span>{adminError}</span></div>}
          <section className="physical-card-frame">
          <div className="physical-card physical-card-vertical">
            <header className="simple-card-header">
              <div className="simple-card-title"><p>{viewLabels.simpleTitle}</p><h1>Gestión {viewLabels.managementYear}</h1></div>
              <div className="simple-lot-badge"><small>N° DE LOTE</small><strong>{demoNeighbor.lot}</strong></div>
            </header>
            <div className="simple-owner-data">
              <span><small>Nombre completo</small><strong>{demoNeighbor.name.toUpperCase()}</strong></span>
              <span><small>Calle / avenida</small><strong>{demoNeighbor.street.toUpperCase()}</strong></span>
            </div>
            {notice.active && <NextEventBanner notice={notice} />}
            <p className="card-touch-help"><span aria-hidden="true">☝</span> Toque cualquier cuadro con información para ver su detalle.</p>
            <div className="summary-control" aria-label="Tarjeta vecinal resumida">
              {cardData.map((row, rowIndex) => (
                <section className={`summary-category ${rowIndex === 0 ? "with-month-labels" : "blank-entry-row"}`} key={row.label}>
                  <header><h2>{row.label}</h2></header>
                  <div className="summary-month-grid">
                    {row.values.map((status, monthIndex) => {
                      const month = fullMonthNames[monthIndex] ?? `Cuadro ${monthIndex + 1}`;
                      const cellLabel = row.cellLabels[monthIndex] ?? "";
                      const hasEntry = Boolean(cellLabel || row.details[monthIndex]);
                      const statusText = status === "done" ? (row.kind === "attendance" ? "Asistió" : "Pagó") : status === "pending" ? (row.kind === "attendance" ? "Faltó" : "Pendiente") : hasEntry ? "Programado" : "Sin actividad";
                      return (
                        <button type="button" className={`summary-month ${status} ${hasEntry ? "has-entry" : ""}`} key={`${row.label}-${month}`} aria-label={`${row.label}, ${month}: ${statusText}${hasEntry || status !== "empty" ? ". Toque para ver el detalle" : ""}`} onClick={() => (hasEntry || status !== "empty") && setSelectedCardCell({ rowIndex, monthIndex })} disabled={!hasEntry && status === "empty"}>
                          {rowIndex === 0 && <span>{month.slice(0, 3)}</span>}
                          <b>{status === "done" ? "✓" : status === "pending" ? "×" : hasEntry ? "•" : ""}</b>
                          {cellLabel && <small>{cellLabel}</small>}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <DebtBreakdown total={demoBalance} items={visitorDebtItems} />
            <a className="compact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer"><span aria-hidden="true">?</span><b>¿Tiene alguna duda?</b><small>Presione aquí para escribirnos por WhatsApp</small></a>
          </div>
          </section>
          {selectedCardCell && selectedCellRow && <CardDetailDialog row={selectedCellRow} monthIndex={selectedCardCell.monthIndex} status={selectedCellStatus} onClose={() => setSelectedCardCell(null)} />}
        </main>
      );
    }

    if (visitorView === "detallado") {
      return (
        <main className="visitor-page detail-page" id="modo-detallado" style={themeStyle}>
          <DemoBar onAdmin={() => openAdmin()} onNeighbor={() => openNeighbor()} active="vecino" />
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
          {notice.active && <NextEventBanner notice={notice} wide />}
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
                          {status === "empty" ? <i>—</i> : <button type="button" onClick={() => setSelectedCardCell({ rowIndex: cardData.indexOf(row), monthIndex: index })}>{status === "done" ? "✓" : "×"}</button>}
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
            <DebtBreakdown total={demoBalance} items={visitorDebtItems} compact />
            <a className="whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer"><span aria-hidden="true">WA</span> Consultar por WhatsApp →</a>
          </section>
          {selectedCardCell && selectedCellRow && <CardDetailDialog row={selectedCellRow} monthIndex={selectedCardCell.monthIndex} status={selectedCellStatus} onClose={() => setSelectedCardCell(null)} />}
        </main>
      );
    }

    return (
      <main className="neighbor-shell" style={themeStyle}>
        <DemoBar onAdmin={() => openAdmin()} onNeighbor={() => openNeighbor()} active="vecino" />
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
              <div className="notice-date" aria-hidden="true"><strong>{new Date(`${notice.eventDate}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat("es-BO", { month: "short" }).format(new Date(`${notice.eventDate}T12:00:00`)).replace(".", "").toUpperCase()}</span></div>
              <div><p className="notice-label">Próximo evento · {notice.eventType}</p><h2>{notice.title}</h2><p>{notice.eventTime} · {notice.eventPlace}</p></div>
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
      <DemoBar onAdmin={() => openAdmin(section)} onNeighbor={() => openNeighbor()} active="admin" />
      <aside className="admin-sidebar">
        <div className="admin-brand"><div className="zone-mark">U.V.<br />4-O</div><div><strong>Sistema Vecinal</strong><span>Mariscal Santa Cruz</span></div></div>
        <nav aria-label="Administración">
          {navItems.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-help"><span>Gestión {viewLabels.managementYear}</span><strong>{adminError ? "Revisar conexión" : adminLoading ? "Sincronizando…" : "Todo guardado"}</strong><small>Cloudflare D1</small></div>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar">
          <div><span className="admin-kicker">Panel administrativo</span><h1>{navItems.find((item) => item.id === section)?.label}</h1></div>
          <div className="admin-user"><span>EM</span><div><strong>Presidencia</strong><small>Administrador</small></div></div>
        </header>
        {adminLoading && <div className="data-status loading">Cargando información guardada…</div>}
        {adminError && <div className="data-status error"><strong>No se pudo abrir la base de datos.</strong><span>{adminError}</span><button onClick={() => void loadAdminState()}>Reintentar</button></div>}
        {section === "resumen" && (
          <div className="admin-section">
            <div className="welcome-admin-card"><div><span>Buen día</span><h2>¿Qué desea registrar hoy?</h2><p>Las tareas frecuentes están a un toque. El sistema actualiza automáticamente las tarjetas vecinales.</p></div><div className="admin-date"><strong>18</strong><span>Agosto 2026</span></div></div>
            <div className="quick-actions">
              <button onClick={() => { setSection("vecinos"); setShowNeighborForm(true); }}><span>＋</span><strong>Nuevo vecino</strong><small>Registrar y crear QR</small></button>
              <button onClick={() => { setSection("actividades"); setEditingActivityId(null); setShowActivityForm(true); }}><span>◇</span><strong>Nueva actividad</strong><small>Reunión, trabajo o cuota</small></button>
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
            <SectionIntro title="Vecinos registrados" text="Registre una sola vez. El QR y la tarjeta del vecino se preparan automáticamente." action="Registrar vecino" onAction={() => { setEditingNeighborId(null); setShowNeighborForm((value) => !value); }} />
            {showNeighborForm && (
              <form className="inline-form neighbor-form" key={editingNeighbor?.id ?? "new-neighbor"} onSubmit={addNeighbor}>
                <label>Nombre completo<input name="name" defaultValue={editingNeighbor?.name ?? ""} required placeholder="Ej. María Flores" /></label>
                <label>Calle o avenida<input name="street" defaultValue={editingNeighbor?.street ?? ""} required placeholder="Ej. Calle Los Pinos" /></label>
                <label>Número de lote<input name="lot" defaultValue={editingNeighbor?.lot ?? ""} required placeholder="Ej. 705" /></label>
                <label>Teléfono opcional<input name="phone" defaultValue={editingNeighbor?.phone ?? ""} placeholder="Ej. 70000000" /></label>
                <div className="activity-form-actions">
                  <button type="submit" className="primary-action">{editingNeighbor ? "Guardar corrección" : "Guardar y generar QR"}</button>
                  {editingNeighbor && <button type="button" className="cancel-action" onClick={() => { setEditingNeighborId(null); setShowNeighborForm(false); }}>Cancelar</button>}
                </div>
              </form>
            )}
            <section className="admin-panel">
              <div className="panel-heading"><div><span>{neighbors.length} registros</span><h2>Directorio vecinal</h2></div><button className="yellow-action" onClick={downloadQrPdf}>Descargar PDF de QR</button></div>
              <div className="neighbor-cards">
                {neighbors.map((neighbor) => <article className="neighbor-card" key={neighbor.id}><QrTile neighbor={neighbor} /><div><span className={`status-dot ${balanceOf(neighbor) ? "has-debt" : "clear"}`}>{balanceOf(neighbor) ? "Pendiente" : "Al día"}</span><h3>{neighbor.name}</h3><p>{neighbor.street} · Lote {neighbor.lot}</p><p>{neighbor.code}</p><div className="neighbor-actions"><button onClick={() => window.open(`/?token=${encodeURIComponent(neighbor.token)}`, "_blank", "noopener,noreferrer")}>Ver tarjeta</button><button onClick={() => { setEditingNeighborId(neighbor.id); setShowNeighborForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button className="delete-action" onClick={() => void deleteNeighbor(neighbor)}>Eliminar</button></div></div></article>)}
                {!neighbors.length && <div className="empty-state"><strong>Aún no hay vecinos.</strong><span>Pulse “Registrar vecino” para crear el primero y generar su QR.</span></div>}
              </div>
            </section>
          </div>
        )}
        {section === "actividades" && (
          <div className="admin-section">
            <SectionIntro title="Actividades y cuotas" text="Al crear o corregir una actividad, la tarjeta se actualiza automáticamente. Puede modificar nombre, categoría, fecha y monto cuando detecte un error." action="Crear actividad" onAction={() => { setEditingActivityId(null); setShowActivityForm((value) => !value); }} />
            {showActivityForm && <form className="inline-form activity-form" key={editingActivity?.id ?? "new-activity"} onSubmit={addActivity}><label>Tipo<select name="type" defaultValue={editingActivityType}><option>Asamblea</option><option>Trabajo</option><option>Marcha / desfile</option><option>Cuota mensual</option><option>Cuota extra</option><option>Otro personalizado</option></select></label><label>Tipo personalizado<input name="customType" defaultValue={editingCustomType} placeholder="Ej. Fumigación o seguridad" /></label><label className="wide-field">Nombre<input name="title" defaultValue={editingActivity?.title ?? ""} required placeholder="Ej. Limpieza de la plaza" /></label><label>Fecha<input name="date" type="date" defaultValue={editingActivity?.date ?? "2026-09-10"} required /></label><label>Monto o multa Bs<input name="fine" type="number" min="0" step="0.01" defaultValue={editingActivity?.fine ?? 50} required /></label><div className="activity-form-actions"><button type="submit" className="primary-action">{editingActivity ? "Guardar corrección" : "Guardar y mostrar"}</button>{editingActivity && <button type="button" className="cancel-action" onClick={() => { setEditingActivityId(null); setShowActivityForm(false); }}>Cancelar</button>}</div></form>}
            <div className="activity-list">{activities.map((activity) => <article key={activity.id}><div className="activity-date"><strong>{new Date(`${activity.date}T00:00:00`).getUTCDate()}</strong><span>{new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "UTC" }).format(new Date(`${activity.date}T00:00:00Z`))}</span></div><div className="activity-main"><span>{activity.type} · {activity.code}</span><h3>{activity.title}</h3><p>Monto o multa configurada: <strong>Bs {formatBs(activity.fine)}</strong></p></div><span className={`activity-status ${activity.status === "Cerrada" ? "closed" : "scheduled"}`}>{activity.status}</span><div className="activity-actions"><button className="ghost-action" onClick={() => { setEditingActivityId(activity.id); setShowActivityForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button className="ghost-action" onClick={() => { setSelectedActivity(activity.id); setSection("asistencia"); }}>Asistencia →</button></div></article>)}{!activities.length && <div className="empty-state"><strong>Aún no hay actividades.</strong><span>Cree una asamblea, cuota, trabajo u otro evento para comenzar.</span></div>}</div>
          </div>
        )}
        {section === "asistencia" && (
          <div className="admin-section">
            <SectionIntro title="Marcar asistencia" text="Todos aparecen presentes inicialmente. Cambie solamente a quienes faltaron o fueron justificados." />
            {!selectedActivityData ? <div className="empty-state"><strong>Primero debe crear una actividad.</strong><span>Después podrá marcar presentes, faltas o justificaciones.</span></div> : (
              <section className="admin-panel attendance-panel"><div className="attendance-select"><label>Actividad<select value={selectedActivity} onChange={(event) => setSelectedActivity(Number(event.target.value))}>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.code} · {activity.title}</option>)}</select></label><div><span>Multa configurada</span><strong>Bs {formatBs(selectedActivityData.fine)}</strong></div></div>
                <div className="attendance-list">{neighbors.map((neighbor) => <article key={neighbor.id}><div className="avatar">{neighbor.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div className="attendance-name"><strong>{neighbor.name}</strong><span>Lote {neighbor.lot} · {neighbor.code}</span></div><div className="attendance-buttons">{(["Presente", "Faltó", "Justificado"] as AttendanceStatus[]).map((status) => <button key={status} className={(selectedAttendance[neighbor.id] ?? "Presente") === status ? `selected ${status.toLowerCase().replace("ó", "o")}` : ""} onClick={() => setAttendanceByActivity((current) => ({ ...current, [selectedActivity]: { ...(current[selectedActivity] ?? {}), [neighbor.id]: status } }))}>{status}</button>)}</div></article>)}</div>
                {!neighbors.length && <div className="empty-state"><strong>No hay vecinos activos.</strong><span>Registre vecinos antes de guardar asistencia.</span></div>}
                <div className="attendance-footer"><p><strong>{Object.values(selectedAttendance).filter((status) => status === "Faltó").length} faltas</strong> · Revise antes de confirmar.</p><button className="primary-action" disabled={!neighbors.length} onClick={() => void saveAttendance()}>Guardar asistencia y actualizar tarjeta</button></div>
              </section>
            )}
          </div>
        )}
        {section === "pagos" && (
          <div className="admin-section">
            <SectionIntro title="Registrar pago" text="Busque al vecino, revise su saldo y registre un pago parcial o total. Se generará un comprobante." />
            {neighbors.length ? <form className="payment-form" onSubmit={registerPayment}><label>Vecino<select name="neighbor" required>{neighbors.map((neighbor) => <option key={neighbor.id} value={neighbor.id}>{neighbor.code} · {neighbor.name} · Lote {neighbor.lot} · Saldo Bs {formatBs(balanceOf(neighbor))}</option>)}</select></label><label>Fecha<input name="date" type="date" defaultValue={today} required /></label><label>Monto Bs<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" /></label><label className="full-field">Observación<input name="note" placeholder="Ej. Pago parcial de deuda" /></label><button className="primary-action" type="submit">Guardar pago</button></form> : <div className="empty-state"><strong>No hay vecinos registrados.</strong><span>Registre al primer vecino antes de guardar un pago.</span></div>}
            <section className="admin-panel"><div className="panel-heading"><div><span>{payments.length} registros</span><h2>Pagos recientes</h2></div></div><div className="responsive-table"><table><thead><tr><th>Fecha</th><th>Vecino</th><th>Comprobante</th><th>Observación</th><th>Monto</th></tr></thead><tbody>{payments.map((payment) => { const neighbor = neighbors.find((item) => item.id === payment.neighborId); return <tr key={payment.id}><td>{formatDate(payment.date)}</td><td><strong>{neighbor?.name}</strong><small>Lote {neighbor?.lot}</small></td><td>{payment.receipt}</td><td>{payment.note}</td><td><span className="paid-pill">Bs {formatBs(payment.amount)}</span></td></tr>; })}</tbody></table></div></section>
          </div>
        )}
        {section === "vistas" && (
          <div className="admin-section">
            <SectionIntro title="Personalizar tarjeta del vecino" text="Cambie los cuadros, importes y textos desde este panel. La modificación se refleja inmediatamente en la tarjeta que abre el código QR." />
            <div className="view-editor-tabs" role="tablist" aria-label="Vista que desea modificar">
              <button className={viewEditorMode === "tarjeta" ? "active" : ""} onClick={() => setViewEditorMode("tarjeta")}>Tarjeta vecinal</button>
              <button className={viewEditorMode === "apariencia" ? "active" : ""} onClick={() => setViewEditorMode("apariencia")}>Colores y textos</button>
            </div>
            {viewEditorMode === "tarjeta" ? (
              <section className="admin-panel view-editor-panel">
                <div className="panel-heading"><div><span>Tarjeta virtual</span><h2>Modificar un cuadro</h2></div><button onClick={() => openNeighbor()}>Ver tarjeta →</button></div>
                <p className="editor-help">Seleccione la categoría y el cuadro. Escriba un texto corto para mostrar dentro de la casilla, por ejemplo “5 Bs” o “Limpieza”. La explicación completa aparecerá cuando el vecino toque el símbolo. Trabajos dispone de 24 cuadros en dos filas.</p>
                <div className="editor-selectors">
                  <label>Categoría<select value={selectedCardCategory} onChange={(event) => { setSelectedCardCategory(Number(event.target.value)); setSelectedCardMonth(0); }}>{cardData.map((row, index) => <option key={row.label} value={index}>{row.label}</option>)}</select></label>
                  <label>Cuadro<select value={selectedCardMonth} onChange={(event) => setSelectedCardMonth(Number(event.target.value))}>{selectedCardRow.values.map((_, index) => <option key={`${selectedCardRow.label}-${index}`} value={index}>{selectedCardCategory === 0 ? fullMonthNames[index] : `Cuadro ${index + 1}`}</option>)}</select></label>
                </div>
                <form className="view-editor-form" key={`${selectedCardCategory}-${selectedCardMonth}-${selectedCardStatus}-${selectedCardLabel}-${selectedCardDetail}`} onSubmit={updateCardCell}>
                  <label>Resultado<select name="status" defaultValue={selectedCardStatus}><option value="done">✓ Cumplió / pagó</option><option value="pending">× Faltó / no pagó</option><option value="empty">Sin actividad</option></select></label>
                  <label>Texto visible en el cuadro<input name="cellLabel" defaultValue={selectedCardLabel} maxLength={18} placeholder="Ej. 5 Bs o Limpieza" /></label>
                  <label>Explicación al tocar<input name="detail" defaultValue={selectedCardDetail} placeholder="Ej. Cuota mensual para mantenimiento" /></label>
                  <button className="primary-action" type="submit">Guardar cambio</button>
                </form>
                <div className={`editor-cell-preview ${selectedCardStatus}`}><span>{selectedCardCategory === 0 ? fullMonthNames[selectedCardMonth] : `Cuadro ${selectedCardMonth + 1}`}</span><b>{selectedCardStatus === "done" ? "✓" : selectedCardStatus === "pending" ? "×" : ""}</b>{selectedCardStatus !== "empty" && selectedCardLabel && <small>{selectedCardLabel}</small>}</div>
              </section>
            ) : (
              <div className="appearance-editor-grid">
                <section className="admin-panel view-editor-panel">
                  <div className="panel-heading"><div><span>Personalización</span><h2>Colores generales</h2></div><button onClick={() => openNeighbor()}>Ver tarjeta →</button></div>
                  <p className="editor-help">Los cambios se guardan en Cloudflare D1 y se muestran en la tarjeta que abre el QR.</p>
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
            <SectionIntro title="Avisos para los vecinos" text="Publique el próximo evento y sus datos. Aparecerá en la tarjeta que abre cada QR." />
            <div className="notice-admin-grid"><form className="notice-form" onSubmit={publishNotice}><div className="form-two-cols"><label>Tipo de evento<select name="eventType" defaultValue={notice.eventType}><option>Asamblea general</option><option>Marcha o desfile</option><option>Trabajo comunitario</option><option>Otro evento</option></select></label><label>Título<input name="title" defaultValue={notice.title} required /></label></div><div className="form-three-cols"><label>Fecha<input name="eventDate" type="date" defaultValue={notice.eventDate} required /></label><label>Hora<input name="eventTime" type="time" defaultValue={notice.eventTime} required /></label><label>Lugar<input name="eventPlace" defaultValue={notice.eventPlace} required /></label></div><label>Descripción<textarea name="body" defaultValue={notice.body} rows={3} required /></label><label>WhatsApp de la directiva<input name="whatsapp" defaultValue={notice.whatsapp} inputMode="tel" placeholder="Ej. 59170000000" /></label><label>Fotografía opcional<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setNotice((current) => ({ ...current, image: URL.createObjectURL(file) })); }} /></label><button className="primary-action" type="submit">Publicar próximo evento</button></form><article className="notice-preview"><span>Vista previa del vecino</span><div className="notice-photo" style={notice.image ? { backgroundImage: `url(${notice.image})` } : undefined}>{!notice.image && <><strong>U.V. 4-O</strong><small>Próximo evento</small></>}</div><div><b>{notice.eventType}</b><h3>{notice.title}</h3><p>{formatDate(notice.eventDate)} · {notice.eventTime} · {notice.eventPlace}</p></div></article></div>
          </div>
        )}
        {section === "reportes" && (
          <div className="admin-section">
            <SectionIntro title="Reportes y respaldos" text="Descargue documentos listos para imprimir y copias editables para su archivo mensual." />
            <div className="report-grid"><article className="report-card featured"><span>QR</span><h2>Todos los QR de vecinos</h2><p>Hoja carta con hasta 40 etiquetas por página. Cada etiqueta mide 3,5 cm × 3 cm e incluye nombre y lote.</p><button className="yellow-action" onClick={downloadQrPdf}>Descargar PDF de QR</button></article><article className="report-card"><span>CSV</span><h2>Reporte de deudores</h2><p>Listado actualizado de vecinos con saldo pendiente.</p><button onClick={downloadDebtorsCsv}>Descargar deudores</button></article><article className="report-card"><span>PDF</span><h2>Resumen mensual</h2><p>Actividades, multas generadas y pagos del mes actual.</p><button onClick={() => void downloadMonthlySummary()}>Generar resumen</button></article><article className="report-card"><span>↺</span><h2>Respaldo completo</h2><p>Copia de vecinos, actividades, asistencias, pagos, avisos y configuración.</p><button onClick={downloadFullBackup}>Descargar respaldo</button></article></div>
            <div className="backup-status"><div className="backup-check">✓</div><div><strong>Datos protegidos</strong><p>La base principal está en Cloudflare D1 y el respaldo se descarga en formato JSON.</p></div><span>Gestión {viewLabels.managementYear}</span></div>
          </div>
        )}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function DemoBar({ onAdmin, onNeighbor, active }: { onAdmin: () => void; onNeighbor: () => void; active: "vecino" | "admin" }) {
  return <div className="demo-bar"><span>Sistema conectado a Cloudflare D1</span><div><button className={active === "vecino" ? "active" : ""} onClick={onNeighbor}>Vista vecino</button><button className={active === "admin" ? "active" : ""} onClick={onAdmin}>Panel administrativo</button></div></div>;
}

function NextEventBanner({ notice, wide = false }: { notice: Notice; wide?: boolean }) {
  const date = new Date(`${notice.eventDate}T12:00:00`);
  const day = new Intl.DateTimeFormat("es-BO", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("es-BO", { month: "short" }).format(date).replace(".", "").toUpperCase();
  return <article className={`next-event-banner ${wide ? "wide" : ""}`}>
    <div className="event-date-block" aria-label={formatDate(notice.eventDate)}><strong>{day}</strong><span>{month}</span></div>
    <div className="event-banner-copy"><span>Próximo evento · {notice.eventType}</span><h2>{notice.title}</h2><p>{notice.body}</p><div className="event-meta"><b>◷ {notice.eventTime}</b><b>⌖ {notice.eventPlace}</b></div></div>
  </article>;
}

function CardDetailDialog({ row, monthIndex, status, onClose }: { row: CardRow; monthIndex: number; status: CardStatus; onClose: () => void }) {
  const statusLabel = status === "done" ? (row.kind === "attendance" ? "Asistió" : "Pagado") : status === "pending" ? (row.kind === "attendance" ? "No asistió" : "Pendiente de pago") : "Actividad programada";
  const detail = row.details[monthIndex] || "No hay una observación adicional registrada.";
  const slotName = fullMonthNames[monthIndex] ?? `Cuadro ${monthIndex + 1}`;
  const fine = detail.match(/Bs\s*(\d+(?:[.,]\d+)?)/i)?.[1];
  return <div className="cell-dialog-backdrop">
    <section className="cell-dialog" role="dialog" aria-modal="true" aria-labelledby="cell-dialog-title">
      <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar detalle">×</button>
      <div className={`dialog-status ${status}`} aria-hidden="true">{status === "done" ? "✓" : status === "pending" ? "×" : "•"}</div>
      <span>{row.label} · {slotName}</span>
      <h2 id="cell-dialog-title">{statusLabel}</h2>
      <p>{detail}</p>
      <dl><div><dt>Resultado</dt><dd>{statusLabel}</dd></div>{fine && <div><dt>Monto registrado</dt><dd>Bs {fine}</dd></div>}</dl>
      <button type="button" className="dialog-understood" onClick={onClose}>Entendido</button>
    </section>
  </div>;
}

function DebtBreakdown({ total, items, compact = false }: { total: number; items: DebtItem[]; compact?: boolean }) {
  const registeredTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const adjustment = total - registeredTotal;
  const displayedItems = adjustment === 0 ? items : [
    ...items,
    {
      concept: adjustment > 0 ? "Otros saldos pendientes" : "Pagos aplicados",
      detail: adjustment > 0 ? "Importe pendiente de asignar" : "Descuento registrado después del detalle",
      date: "Estado actualizado",
      amount: adjustment,
    },
  ];
  const calculatedTotal = displayedItems.reduce((sum, item) => sum + item.amount, 0);
  return <section className={`debt-breakdown ${compact ? "compact" : ""}`} aria-label="Detalle de deuda pendiente">
    <header><div><span>Estado económico</span><h2>Detalle de deuda pendiente</h2></div><b>{displayedItems.length} {displayedItems.length === 1 ? "concepto" : "conceptos"}</b></header>
    <div className="debt-lines">{displayedItems.map((item) => <article key={`${item.concept}-${item.detail}`}><div><strong>{item.concept}</strong><span>{item.detail}</span><small>{item.date}</small></div><b>Bs {formatBs(item.amount)}</b></article>)}</div>
    <footer><span>Deuda total calculada</span><strong>Bs {formatBs(calculatedTotal)}</strong></footer>
  </section>;
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

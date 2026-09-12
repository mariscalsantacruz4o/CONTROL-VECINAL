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
  balance?: number;
  allocated?: number;
  unallocated?: number;
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

type DebtItem = { concept: string; detail: string; date: string; amount: number; category?: ActivityCategoryId; sortDate?: string };
type ActivityCharge = DebtItem & { neighborId: number; activityId: number };

type Payment = {
  id: number;
  neighborId: number;
  date: string;
  amount: number;
  note: string;
  receipt: string;
  activityId?: number | null;
  activityTitle?: string;
  activityCode?: string;
  cardRowIndex?: number | null;
  method?: string;
  allocationMethod?: "exact" | "legacy";
};

type AccountMovement = {
  key: string;
  rawDate: string;
  type: "control" | "charge" | "payment";
  concept: string;
  detail: string;
  receipt: string;
  charge: number;
  payment: number;
  balance: number;
};

type AdminSection = "resumen" | "vecinos" | "padron" | "actividades" | "asistencia" | "pagos" | "vistas" | "avisos" | "reportes";
type VisitorView = "inicio" | "sencillo" | "detallado";
type AttendanceStatus = "Presente" | "Faltó" | "Justificado";
type ControlStatus = AttendanceStatus | "Regularizado" | "Sin registrar";
type CardStatus = "done" | "pending" | "empty";
type ActivityCategoryId = "asambleas" | "cuotas-mensuales" | "cuotas-extras" | "otros" | "trabajos";
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

const PUBLIC_SITE_URL = "https://control-vecinal.mariscalsantacruz-4o.workers.dev";

function publicNeighborUrl(token: string) {
  return `${PUBLIC_SITE_URL}/?token=${encodeURIComponent(token)}`;
}

type AttendanceRecord = {
  id: number;
  activityId: number;
  neighborId: number;
  status: AttendanceStatus;
  charge: number;
  paid?: number;
  balance?: number;
  paymentStatus?: "none" | "pending" | "partial" | "paid";
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

const activityCategories: Array<{
  id: ActivityCategoryId;
  label: string;
  rowIndex: number;
  defaultType: string;
  kind: "attendance" | "contribution";
}> = [
  { id: "asambleas", label: "Asambleas", rowIndex: 0, defaultType: "Asamblea", kind: "attendance" },
  { id: "cuotas-mensuales", label: "Cuotas mensuales", rowIndex: 1, defaultType: "Cuota mensual", kind: "contribution" },
  { id: "cuotas-extras", label: "Cuotas extras", rowIndex: 2, defaultType: "Cuota extra", kind: "contribution" },
  { id: "otros", label: "Otros", rowIndex: 3, defaultType: "Marcha / desfile", kind: "attendance" },
  { id: "trabajos", label: "Trabajos", rowIndex: 4, defaultType: "Trabajo", kind: "attendance" },
];

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const blankDetails = Array(12).fill("");
const blankWorkDetails = Array(24).fill("");
const cardRows: CardRow[] = [
  {
    label: "Asambleas",
    kind: "attendance",
    values: Array(12).fill("empty") as CardStatus[],
    cellLabels: [...blankDetails],
    details: [...blankDetails],
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
    values: Array(12).fill("empty") as CardStatus[],
    cellLabels: [...blankDetails],
    details: [...blankDetails],
  },
  {
    label: "Trabajos",
    kind: "attendance",
    values: Array(24).fill("empty") as CardStatus[],
    cellLabels: [...blankWorkDetails],
    details: [...blankWorkDetails],
  },
];

const navItems: Array<{ id: AdminSection; label: string; icon: string }> = [
  { id: "resumen", label: "Inicio", icon: "⌂" },
  { id: "vecinos", label: "Vecinos y QR", icon: "◎" },
  { id: "padron", label: "Padrón y calles", icon: "▦" },
  { id: "actividades", label: "Actividades y cuotas", icon: "◇" },
  { id: "asistencia", label: "Control por vecino", icon: "✓" },
  { id: "pagos", label: "Historial", icon: "Bs" },
  { id: "vistas", label: "Vistas del vecino", icon: "✎" },
  { id: "avisos", label: "Avisos", icon: "!" },
  { id: "reportes", label: "Reportes", icon: "↓" },
];

function formatBs(value: number) {
  return new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 }).format(value);
}

function csvCell(value: string | number) {
  const raw = String(value);
  const text = typeof value === "string" && /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeFilePart(value: string) {
  return searchableText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase() || "VECINO";
}

function saveCsv(filename: string, rows: Array<Array<string | number>>) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", body], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function activityCategoryFromRowIndex(rowIndex: number) {
  return activityCategories.find((category) => category.rowIndex === rowIndex) ?? activityCategories[3];
}

function activityCategoryById(id: string) {
  return activityCategories.find((category) => category.id === id) ?? activityCategories[0];
}

function isContributionActivity(activity?: Activity | null) {
  return activity?.cardRowIndex === 1 || activity?.cardRowIndex === 2;
}

function debtConceptForActivity(activity: Activity) {
  if (activity.cardRowIndex === 1) return "Cuota mensual pendiente";
  if (activity.cardRowIndex === 2) return "Cuota extra pendiente";
  if (activity.cardRowIndex === 0) return "Asamblea pendiente";
  if (activity.cardRowIndex === 4) return "Trabajo pendiente";
  return `${activity.type} pendiente`;
}

function suggestedCategoryForActivity(activity: Activity) {
  if (activity.cardRowIndex !== 3) return null;
  const value = searchableText(`${activity.type} ${activity.title}`);
  if (value.includes("asamblea") || value.includes("reunion")) return activityCategoryById("asambleas");
  if (value.includes("mensualidad") || value.includes("cuota mensual")) return activityCategoryById("cuotas-mensuales");
  if (value.includes("cuota") || value.includes("aporte") || value.includes("pago")) return activityCategoryById("cuotas-extras");
  if (value.includes("trabajo") || value.includes("limpieza")) return activityCategoryById("trabajos");
  return null;
}

function outstandingDebtItems(items: DebtItem[], paidAmount: number) {
  let paymentAvailable = Math.max(0, paidAmount);
  return [...items]
    .sort((first, second) => (first.sortDate ?? "").localeCompare(second.sortDate ?? ""))
    .flatMap<DebtItem>((item) => {
      const applied = Math.min(item.amount, paymentAvailable);
      paymentAvailable -= applied;
      const pendingAmount = Math.max(0, item.amount - applied);
      return pendingAmount > 0 ? [{ ...item, amount: pendingAmount }] : [];
    });
}

function accountMovementsFor(neighborId: number, charges: ActivityCharge[], paymentRows: Payment[], attendanceRows: AttendanceRecord[], activityRows: Activity[]) {
  const rows = [
    ...attendanceRows.filter((record) => record.neighborId === neighborId).flatMap((record) => {
      const activity = activityRows.find((item) => item.id === record.activityId);
      if (!activity) return [];
      const contribution = isContributionActivity(activity);
      const result = record.status === "Justificado"
        ? contribution ? "Exento" : "Justificado"
        : record.status === "Presente"
          ? contribution ? "Pagó" : activity.cardRowIndex === 4 ? "Realizó" : "Asistió"
          : record.paymentStatus === "paid"
            ? "Regularizó"
            : contribution ? "No pagó" : activity.cardRowIndex === 4 ? "No realizó" : "No asistió";
      return [{
        key: `s-${record.activityId}`,
        rawDate: activity.date,
        type: "control" as const,
        concept: activity.title,
        detail: `${activityCategoryFromRowIndex(activity.cardRowIndex).label} · ${result}`,
        receipt: "",
        charge: 0,
        payment: 0,
      }];
    }),
    ...charges.filter((charge) => charge.neighborId === neighborId).map((charge) => ({
      key: `c-${charge.activityId}`,
      rawDate: charge.sortDate ?? "",
      type: "charge" as const,
      concept: charge.detail,
      detail: charge.concept,
      receipt: "",
      charge: charge.amount,
      payment: 0,
    })),
    ...paymentRows.filter((payment) => payment.neighborId === neighborId).map((payment) => ({
      key: `p-${payment.id}`,
      rawDate: payment.date,
      type: "payment" as const,
      concept: payment.activityTitle || "Pago anterior sin concepto específico",
      detail: [payment.method && payment.method !== "No especificado" ? payment.method : "", payment.note].filter(Boolean).join(" · ") || "Pago registrado",
      receipt: payment.receipt,
      charge: 0,
      payment: payment.amount,
    })),
  ].sort((first, second) => {
    const dateOrder = first.rawDate.localeCompare(second.rawDate);
    if (dateOrder) return dateOrder;
    const rank = { control: 0, charge: 1, payment: 2 } as const;
    return rank[first.type] - rank[second.type] || first.key.localeCompare(second.key);
  });
  let balance = 0;
  return rows.map<AccountMovement>((row) => {
    balance = Math.round((balance + row.charge - row.payment) * 100) / 100;
    return { ...row, balance };
  });
}

function movementLabel(type: AccountMovement["type"]) {
  return type === "control" ? "Estado" : type === "charge" ? "Cargo" : "Pago";
}

function searchableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-BO")
    .trim();
}

function normalizedLotKey(value: string) {
  return value.replace(/\s+/g, "").toLocaleUpperCase("es-BO").trim();
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Fecha por definir";
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la fotografía"));
    reader.readAsDataURL(file);
  });
}

function loadBrowserImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("La fotografía no tiene un formato válido"));
    image.src = source;
  });
}

async function prepareNoticeImage(file: File) {
  if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type)) throw new Error("Use una fotografía JPG, PNG o WEBP");
  if (file.size > 10 * 1024 * 1024) throw new Error("La fotografía debe pesar menos de 10 MB");
  const source = await readImageFile(file);
  const image = await loadBrowserImage(source);
  const maximumEdge = 1200;
  const scale = Math.min(1, maximumEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la fotografía");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.82, 0.7, 0.58]) {
    const result = canvas.toDataURL("image/jpeg", quality);
    if (result.length <= 800_000) return result;
  }
  throw new Error("La fotografía es demasiado grande. Elija otra imagen");
}

function balanceOf(neighbor: Neighbor) {
  return Math.max(0, neighbor.balance ?? neighbor.generated - neighbor.paid);
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
    row.values[activity.cardSlotIndex] = !record
      ? "empty"
      : record.status === "Justificado"
        ? "done"
        : record.status === "Faltó" && record.paymentStatus !== "paid"
          ? "pending"
          : "done";
    row.cellLabels[activity.cardSlotIndex] = shortCardLabel(activity.type, activity.title, activity.fine);
    row.details[activity.cardSlotIndex] = `${activity.title} · ${formatDate(activity.date)}${record ? ` · ${record.status}` : " · Programada"}${record?.charge ? ` · Multa Bs ${formatBs(record.charge)}` : ""}`;
  }
  return rows;
}

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({})) as T & { error?: string }
    : {} as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación");
  if (!contentType.includes("application/json")) throw new Error("El servidor devolvió una respuesta inválida");
  return data;
}

function normalizeAdminState(value: unknown): AdminState {
  const source = value && typeof value === "object" ? value as Partial<AdminState> : {};
  return {
    neighbors: Array.isArray(source.neighbors) ? source.neighbors : [],
    activities: Array.isArray(source.activities) ? source.activities : [],
    attendance: Array.isArray(source.attendance) ? source.attendance : [],
    payments: Array.isArray(source.payments) ? source.payments : [],
    notice: source.notice && typeof source.notice === "object" ? source.notice : null,
    settings: source.settings && typeof source.settings === "object" ? source.settings : null,
  };
}

function QrTile({ neighbor }: { neighbor: Neighbor }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    const publicUrl = publicNeighborUrl(neighbor.token);
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
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [neighborSearch, setNeighborSearch] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cardData, setCardData] = useState<CardRow[]>(() => emptyCardRows());
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
  const [activityFormCategory, setActivityFormCategory] = useState<ActivityCategoryId>("asambleas");
  const [notice, setNotice] = useState<Notice>({
    title: "",
    body: "",
    active: false,
    image: "",
    eventType: "",
    eventDate: "",
    eventTime: "",
    eventPlace: "",
    whatsapp: "",
  });
  const [noticeImageBusy, setNoticeImageBusy] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(0);
  const [controlSearch, setControlSearch] = useState("");
  const [attendanceByActivity, setAttendanceByActivity] = useState<Record<number, Record<number, ControlStatus>>>({});
  const [activityCharges, setActivityCharges] = useState<ActivityCharge[]>([]);
  const [registrySearch, setRegistrySearch] = useState("");
  const [paymentNeighborSearch, setPaymentNeighborSearch] = useState("");
  const [selectedPaymentNeighborId, setSelectedPaymentNeighborId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState("");

  const demoNeighbor = neighbors[0] ?? { id: 0, code: "", token: "", name: "SIN VECINO REGISTRADO", street: "", lot: "—", phone: "", generated: 0, paid: 0, active: false };
  const demoBalance = balanceOf(demoNeighbor);
  const today = new Date().toISOString().slice(0, 10);
  const totalGenerated = neighbors.reduce((total, neighbor) => total + neighbor.generated, 0);
  const totalPaid = neighbors.reduce((total, neighbor) => total + neighbor.paid, 0);
  const selectedActivityData = activities.find((activity) => activity.id === selectedActivity) ?? activities[0];
  const editingActivity = editingActivityId === null ? null : activities.find((activity) => activity.id === editingActivityId) ?? null;
  const editingNeighbor = editingNeighborId === null ? null : neighbors.find((neighbor) => neighbor.id === editingNeighborId) ?? null;
  const filteredNeighbors = useMemo(() => {
    const query = searchableText(neighborSearch);
    if (!query) return neighbors;
    return neighbors.filter((neighbor) =>
      searchableText(neighbor.name).includes(query) || searchableText(neighbor.lot).includes(query)
    );
  }, [neighborSearch, neighbors]);
  const duplicateLotGroups = useMemo(() => {
    const groups = new Map<string, Neighbor[]>();
    for (const neighbor of neighbors) {
      const key = normalizedLotKey(neighbor.lot);
      if (!key || key === "—") continue;
      groups.set(key, [...(groups.get(key) ?? []), neighbor]);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  }, [neighbors]);
  const activeNeighbors = useMemo(() => neighbors.filter((neighbor) => neighbor.active), [neighbors]);
  const registeredLots = useMemo(() => new Set(activeNeighbors.map((neighbor) => normalizedLotKey(neighbor.lot)).filter((lot) => lot && lot !== "—")), [activeNeighbors]);
  const registeredStreetCount = useMemo(() => new Set(activeNeighbors.map((neighbor) => searchableText(neighbor.street)).filter((street) => street && street !== "por completar")).size, [activeNeighbors]);
  const incompleteNeighborCount = useMemo(() => activeNeighbors.filter((neighbor) => {
    const street = searchableText(neighbor.street);
    const lot = normalizedLotKey(neighbor.lot);
    return !street || street === "por completar" || !lot || lot === "—";
  }).length, [activeNeighbors]);
  const registryMatches = useMemo(() => {
    const query = searchableText(registrySearch);
    if (!query) return activeNeighbors;
    return activeNeighbors.filter((neighbor) => searchableText(`${neighbor.name} ${neighbor.street} ${neighbor.lot} ${neighbor.code}`).includes(query));
  }, [activeNeighbors, registrySearch]);
  const streetGroups = useMemo(() => {
    const groups = new Map<string, { name: string; neighbors: Neighbor[] }>();
    for (const neighbor of registryMatches) {
      const rawName = neighbor.street.trim() || "POR COMPLETAR";
      const key = searchableText(rawName) || "por completar";
      const current = groups.get(key) ?? { name: rawName, neighbors: [] };
      current.neighbors.push(neighbor);
      groups.set(key, current);
    }
    return [...groups.values()]
      .map((group) => ({ ...group, neighbors: [...group.neighbors].sort((a, b) => a.lot.localeCompare(b.lot, "es", { numeric: true })) }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [registryMatches]);
  const activitiesToReview = useMemo(() => activities.flatMap((activity) => {
    const suggestion = suggestedCategoryForActivity(activity);
    return suggestion ? [{ activity, suggestion }] : [];
  }), [activities]);
  const editingCustomType = editingActivity?.cardRowIndex === 3 ? editingActivity.type : "";
  const selectedAttendance = attendanceByActivity[selectedActivity] ?? {};
  const selectedActivityCategory = activityCategoryFromRowIndex(selectedActivityData?.cardRowIndex ?? 0);
  const selectedActivityIsContribution = selectedActivityCategory.kind === "contribution";
  const selectedStatusOptions: Array<{ value: ControlStatus; label: string }> = selectedActivityIsContribution
    ? [
        { value: "Presente", label: "✓ Pagó" },
        { value: "Faltó", label: "× No pagó" },
        { value: "Justificado", label: "— Exento" },
      ]
    : selectedActivityData?.cardRowIndex === 4
      ? [
          { value: "Presente", label: "✓ Realizó" },
          { value: "Faltó", label: "× No realizó" },
          ...(selectedActivityData?.fine > 0 ? [{ value: "Regularizado" as const, label: "✓ Regularizó" }] : []),
          { value: "Justificado", label: "— Justificado" },
        ]
      : [
          { value: "Presente", label: "✓ Asistió" },
          { value: "Faltó", label: "× No asistió" },
          ...(selectedActivityData?.fine > 0 ? [{ value: "Regularizado" as const, label: "✓ Regularizó" }] : []),
          { value: "Justificado", label: "— Justificado" },
        ];
  const selectedPendingCount = Object.values(selectedAttendance).filter((status) => status === "Faltó").length;
  const selectedUnregisteredCount = activeNeighbors.filter((neighbor) => (selectedAttendance[neighbor.id] ?? "Sin registrar") === "Sin registrar").length;
  const controlNeighbors = useMemo(() => {
    const query = searchableText(controlSearch);
    if (!query) return activeNeighbors;
    return activeNeighbors.filter((neighbor) => searchableText(`${neighbor.name} ${neighbor.street} ${neighbor.lot} ${neighbor.code}`).includes(query));
  }, [activeNeighbors, controlSearch]);
  const paymentNeighborOptions = useMemo(() => {
    const query = searchableText(paymentNeighborSearch);
    const matches = !query ? neighbors : neighbors.filter((neighbor) => searchableText(`${neighbor.name} ${neighbor.lot} ${neighbor.code}`).includes(query));
    const selected = neighbors.find((neighbor) => neighbor.id === selectedPaymentNeighborId);
    return selected && !matches.some((neighbor) => neighbor.id === selected.id) ? [selected, ...matches] : matches;
  }, [neighbors, paymentNeighborSearch, selectedPaymentNeighborId]);
  const selectedPaymentNeighbor = neighbors.find((neighbor) => neighbor.id === selectedPaymentNeighborId) ?? null;
  const selectedAccountMovements = useMemo(
    () => selectedPaymentNeighborId ? accountMovementsFor(selectedPaymentNeighborId, activityCharges, payments, attendanceRecords, activities) : [],
    [selectedPaymentNeighborId, activityCharges, payments, attendanceRecords, activities],
  );
  const selectedCardRow = cardData[selectedCardCategory] ?? cardData[0] ?? cardRows[0];
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
    () => activityCharges.filter((charge) => charge.neighborId === demoNeighbor.id),
    [activityCharges, demoNeighbor.id]
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

  async function selectNoticeImage(file?: File) {
    if (!file) return;
    setNoticeImageBusy(true);
    try {
      const image = await prepareNoticeImage(file);
      setNotice((current) => ({ ...current, image }));
      notify("Fotografía preparada para el aviso");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo preparar la fotografía");
    } finally {
      setNoticeImageBusy(false);
    }
  }

  async function loadAdminState(showProgress = true) {
    if (showProgress) setAdminLoading(true);
    setAdminError("");
    try {
      const response = await apiRequest<unknown>("/api/admin/state", { cache: "no-store" });
      const state = normalizeAdminState(response);
      setNeighbors(state.neighbors);
      setActivities(state.activities);
      setAttendanceRecords(state.attendance);
      setPayments(state.payments);
      const recordsByActivity: Record<number, Record<number, ControlStatus>> = {};
      for (const activity of state.activities) {
        recordsByActivity[activity.id] = Object.fromEntries(state.neighbors.map((neighbor) => [neighbor.id, "Sin registrar" as ControlStatus]));
      }
      for (const record of state.attendance) {
        const activity = state.activities.find((item) => item.id === record.activityId);
        const contribution = isContributionActivity(activity);
        const controlStatus: ControlStatus = contribution
          ? record.status === "Justificado"
            ? "Justificado"
            : record.paymentStatus === "paid"
              ? "Presente"
              : "Faltó"
          : record.status === "Faltó" && record.paymentStatus === "paid"
            ? "Regularizado"
            : record.status;
        recordsByActivity[record.activityId] = { ...(recordsByActivity[record.activityId] ?? {}), [record.neighborId]: controlStatus };
      }
      setAttendanceByActivity(recordsByActivity);
      setActivityCharges(state.attendance.flatMap<ActivityCharge>((record) => {
        if (!record.charge) return [];
        const activity = state.activities.find((item) => item.id === record.activityId);
        if (!activity) return [];
        return [{
          neighborId: record.neighborId,
          activityId: record.activityId,
          concept: debtConceptForActivity(activity),
          detail: activity.title,
          date: formatDate(activity.date),
          amount: record.charge,
          category: activityCategoryFromRowIndex(activity.cardRowIndex).id,
          sortDate: activity.date,
        }];
      }));
      const firstActivityId = state.activities[0]?.id ?? 0;
      setSelectedActivity((current) => state.activities.some((activity) => activity.id === current) ? current : firstActivityId);
      if (state.neighbors[0]) setCardData(cardRowsFromRecords(state.activities, state.attendance, state.neighbors[0].id));
      else setCardData(emptyCardRows());
      applyNotice(state.notice);
      applySettings(state.settings);
    } catch (error) {
      setNeighbors([]);
      setActivities([]);
      setAttendanceRecords([]);
      setPayments([]);
      setAttendanceByActivity({});
      setActivityCharges([]);
      setCardData(emptyCardRows());
      setSelectedActivity(0);
      setAdminError(error instanceof Error ? error.message : "No se pudo cargar la base de datos");
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedCardCell) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCardCell(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedCardCell]);

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
    const enteredStreet = String(form.get("street") ?? "").trim();
    const enteredLot = String(form.get("lot") ?? "").trim();
    const street = enteredStreet || "POR COMPLETAR";
    const lot = enteredLot || "—";
    if (!name) return;
    const lotChanged = !editingNeighbor || normalizedLotKey(editingNeighbor.lot) !== normalizedLotKey(enteredLot);
    const duplicateLot = lotChanged && enteredLot && normalizedLotKey(enteredLot) !== "—"
      ? neighbors.find((neighbor) =>
          neighbor.id !== editingNeighbor?.id
          && neighbor.lot !== "—"
          && normalizedLotKey(neighbor.lot) === normalizedLotKey(enteredLot)
        )
      : undefined;
    if (duplicateLot) {
      notify(`El lote ${enteredLot} ya está registrado a nombre de ${duplicateLot.name}`);
      return;
    }
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
      notify(editingNeighbor
        ? "Datos del vecino corregidos; su QR sigue siendo el mismo"
        : enteredStreet && enteredLot
          ? "Vecino registrado y QR generado"
          : "Registro provisional creado; complete calle y lote después sin cambiar el QR");
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
    if (!title) return;
    const category = activityCategoryById(String(form.get("category") ?? activityFormCategory));
    const customType = String(form.get("customType") ?? "").trim();
    const type = category.id === "otros" ? customType : category.defaultType;
    if (!type) {
      notify("Escriba el tipo de registro que irá en Otros");
      return;
    }
    const date = String(form.get("date") ?? "2026-08-23");
    const fine = Math.max(0, Number(form.get("fine") ?? 0));
    try {
      const result = await apiRequest<{ activity: Activity }>("/api/admin/activities", {
        method: editingActivity ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingActivity?.id, category: category.id, type, title, date, fine }),
      });
      await loadAdminState(false);
      setSelectedActivity(result.activity.id);
      setEditingActivityId(null);
      setShowActivityForm(false);
      setActivityFormCategory("asambleas");
      event.currentTarget.reset();
      notify(editingActivity ? "Actividad corregida y deuda recalculada" : "Actividad creada y añadida a la tarjeta");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar la actividad");
    }
  }

  async function deleteActivity(activity: Activity) {
    const confirmed = window.confirm(
      `¿Eliminar “${activity.title}”?\n\nSolo se eliminará si todavía no tiene control ni pagos. Los registros con historial quedan protegidos.`,
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/api/admin/activities?id=${activity.id}`, { method: "DELETE" });
      await loadAdminState(false);
      notify("Actividad vacía eliminada correctamente");
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo eliminar la actividad");
    }
  }

  function choosePaymentNeighbor(id: number | null) {
    setSelectedPaymentNeighborId(id);
  }

  function openNeighborAccount(id: number) {
    choosePaymentNeighbor(id);
    setPaymentNeighborSearch("");
    setSection("pagos");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    const defaultStatus: ControlStatus = "Sin registrar";
    const unregistered = neighbors.filter((neighbor) => neighbor.active && (currentRecords[neighbor.id] ?? defaultStatus) === "Sin registrar");
    if (unregistered.length) {
      notify(`Falta elegir un resultado para ${unregistered.length} vecino(s)`);
      return;
    }
    const selections = neighbors.filter((neighbor) => neighbor.active).map((neighbor) => currentRecords[neighbor.id] ?? defaultStatus);
    const confirmedCount = selections.filter((status) => status === "Presente").length;
    const regularizedCount = selections.filter((status) => status === "Regularizado").length;
    const pendingCount = selections.filter((status) => status === "Faltó").length;
    const exemptCount = selections.filter((status) => status === "Justificado").length;
    const paymentSelections = selectedActivityIsContribution ? confirmedCount : regularizedCount;
    const confirmation = window.confirm(
      `Revise antes de guardar “${selectedActivityData.title}”:\n\n✓ Confirmados: ${confirmedCount}\n✓ Regularizados: ${regularizedCount}\n× Pendientes: ${pendingCount}\n— Exentos o justificados: ${exemptCount}\n\n${paymentSelections ? `Se registrará el pago completo para ${paymentSelections} vecino(s).` : "No se crearán pagos nuevos."}\n\n¿Los datos son correctos?`,
    );
    if (!confirmation) return;
    try {
      const result = await apiRequest<{ pendingCount: number; generated: number; paidCount: number; paid: number }>("/api/admin/attendance", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          activityId: selectedActivity,
          recordedDate: today,
          records: neighbors.filter((neighbor) => neighbor.active).map((neighbor) => ({
            neighborId: neighbor.id,
            status: (currentRecords[neighbor.id] ?? defaultStatus) === "Regularizado" ? "Faltó" : currentRecords[neighbor.id] ?? defaultStatus,
            settled: (currentRecords[neighbor.id] ?? defaultStatus) === "Regularizado" || (selectedActivityIsContribution && (currentRecords[neighbor.id] ?? defaultStatus) === "Presente"),
            note: "",
          })),
        }),
      });
      await loadAdminState(false);
      const paymentMessage = result.paidCount ? ` · ${result.paidCount} pago(s) guardado(s), Bs ${formatBs(result.paid)}` : "";
      notify(result.pendingCount
        ? `${result.pendingCount} registro(s) con × pendiente(s)${paymentMessage}`
        : `Control guardado sin pendientes${paymentMessage}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo guardar la asistencia");
    }
  }

  function setAllControlStatus(status: ControlStatus) {
    if (!selectedActivityData || !activeNeighbors.length) return;
    const label = selectedStatusOptions.find((option) => option.value === status)?.label ?? status;
    if (!window.confirm(`¿Aplicar “${label}” a los ${activeNeighbors.length} vecinos?\n\nDespués puede corregir casos individuales antes de guardar.`)) return;
    setAttendanceByActivity((current) => ({
      ...current,
      [selectedActivity]: Object.fromEntries(activeNeighbors.map((neighbor) => [neighbor.id, status])),
    }));
  }

  async function downloadQrPdf() {
    notify("Preparando PDF con todos los QR…");
    const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait", compress: true });
    const activeNeighbors = neighbors.filter((neighbor) => neighbor.active);
    const cardWidth = 37;
    const cardHeight = 38;
    const columns = 5;
    const rows = 7;
    const cardsPerPage = columns * rows;
    const gapX = 2;
    const gapY = 1;
    const occupiedWidth = columns * cardWidth + (columns - 1) * gapX;
    const occupiedHeight = rows * cardHeight + (rows - 1) * gapY;
    const startX = (doc.internal.pageSize.getWidth() - occupiedWidth) / 2;
    const startY = (doc.internal.pageSize.getHeight() - occupiedHeight) / 2;
    for (let index = 0; index < activeNeighbors.length; index += 1) {
      const neighbor = activeNeighbors[index];
      if (index > 0 && index % cardsPerPage === 0) doc.addPage();
      const slot = index % cardsPerPage;
      const column = slot % columns;
      const row = Math.floor(slot / columns);
      const x = startX + column * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const qr = QRCode.create(publicNeighborUrl(neighbor.token), { errorCorrectionLevel: "M" });
      doc.setDrawColor(77, 101, 130);
      doc.setLineWidth(0.25);
      doc.rect(x, y, cardWidth, cardHeight);
      const qrX = x + 2;
      const qrY = y + 0.4;
      const qrSize = 33;
      const quietModules = 4;
      const moduleSize = qrSize / (qr.modules.size + quietModules * 2);
      const modulesX = qrX + quietModules * moduleSize;
      const modulesY = qrY + quietModules * moduleSize;
      doc.setFillColor(255, 255, 255);
      doc.rect(qrX, qrY, qrSize, qrSize, "F");
      doc.setFillColor(0, 0, 0);
      for (let moduleRow = 0; moduleRow < qr.modules.size; moduleRow += 1) {
        let runStart = -1;
        for (let moduleColumn = 0; moduleColumn <= qr.modules.size; moduleColumn += 1) {
          const isDark = moduleColumn < qr.modules.size && qr.modules.get(moduleRow, moduleColumn) === 1;
          if (isDark && runStart < 0) runStart = moduleColumn;
          if (!isDark && runStart >= 0) {
            doc.rect(
              modulesX + runStart * moduleSize,
              modulesY + moduleRow * moduleSize,
              (moduleColumn - runStart) * moduleSize + 0.01,
              moduleSize + 0.01,
              "F",
            );
            runStart = -1;
          }
        }
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.5);
      const nameLine = doc.splitTextToSize(neighbor.name.toUpperCase(), 35)[0] || neighbor.name.toUpperCase();
      doc.text(nameLine, x + cardWidth / 2, y + 36.7, { align: "center" });
    }
    doc.save("QR_VECINOS_UV_4-O_2026.pdf");
    notify("PDF de QR descargado");
  }

  function downloadRegistryCsv(list: Neighbor[] = activeNeighbors, label = "COMPLETO") {
    saveCsv(`PADRON_VECINAL_${safeFilePart(label)}_${today}.csv`, [
      ["Código", "Nombre completo", "Calle o avenida", "Lote", "Teléfono", "Estado"],
      ...list.map((neighbor) => [neighbor.code, neighbor.name, neighbor.street, neighbor.lot, neighbor.phone, neighbor.active ? "Activo" : "Inactivo"]),
    ]);
    notify(`Padrón ${label === "COMPLETO" ? "completo" : `de ${label}`} descargado`);
  }

  function downloadDebtorsCsv() {
    const lines = ["Codigo,Nombre,Lote,Asambleas,Cuotas mensuales,Cuotas extras,Otros,Trabajos,Saldo total"];
    neighbors.filter((neighbor) => balanceOf(neighbor) > 0).forEach((neighbor) => {
      const pending = outstandingDebtItems(activityCharges.filter((charge) => charge.neighborId === neighbor.id), neighbor.paid);
      const subtotal = (category: ActivityCategoryId) => pending.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0);
      lines.push([
        neighbor.code,
        neighbor.name,
        neighbor.lot,
        subtotal("asambleas"),
        subtotal("cuotas-mensuales"),
        subtotal("cuotas-extras"),
        subtotal("otros"),
        subtotal("trabajos"),
        balanceOf(neighbor),
      ].map(csvCell).join(","));
    });
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "DEUDORES_UV_4-O_2026.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Reporte de deudores descargado");
  }

  function downloadIncomeLedgerCsv() {
    saveCsv(`LIBRO_GENERAL_INGRESOS_${today}.csv`, [
      ["Fecha", "Comprobante", "Código", "Vecino", "Lote", "Concepto", "Método", "Observación", "Monto Bs"],
      ...payments.map((payment) => {
        const neighbor = neighbors.find((item) => item.id === payment.neighborId);
        return [
          payment.date,
          payment.receipt,
          neighbor?.code ?? "",
          neighbor?.name ?? "Vecino eliminado",
          neighbor?.lot ?? "",
          payment.activityTitle || "Pago anterior sin concepto específico",
          payment.method || "No especificado",
          payment.note,
          payment.amount,
        ];
      }),
    ]);
    notify("Libro general de ingresos descargado");
  }

  function downloadNeighborMovementsCsv(neighbor: Neighbor, movements: AccountMovement[]) {
    saveCsv(`MOVIMIENTOS_${safeFilePart(neighbor.name)}_LOTE_${safeFilePart(neighbor.lot)}.csv`, [
      ["Vecino", neighbor.name],
      ["Código", neighbor.code],
      ["Lote", neighbor.lot],
      ["Generado Bs", neighbor.generated],
      ["Pagado Bs", neighbor.paid],
      ["Saldo Bs", balanceOf(neighbor)],
      [],
      ["Fecha", "Movimiento", "Concepto", "Detalle", "Comprobante", "Cargo Bs", "Pago Bs", "Saldo Bs"],
      ...movements.map((movement) => [
        movement.rawDate,
        movementLabel(movement.type),
        movement.concept,
        movement.detail,
        movement.receipt,
        movement.charge || "",
        movement.payment || "",
        movement.balance,
      ]),
    ]);
    notify("Movimientos del vecino descargados");
  }

  async function downloadNeighborMovementsPdf(neighbor: Neighbor, movements: AccountMovement[]) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait" });
    let y = 20;
    const printHeader = () => {
      doc.setTextColor(16, 42, 82);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("ESTADO DE CUENTA VECINAL", 18, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`${neighbor.name} · Lote ${neighbor.lot} · ${neighbor.code}`, 18, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: Bs ${formatBs(neighbor.generated)}   Pagado: Bs ${formatBs(neighbor.paid)}   Saldo: Bs ${formatBs(balanceOf(neighbor))}`, 18, y);
      y += 10;
    };
    printHeader();
    doc.setFontSize(8);
    for (const movement of movements) {
      if (y > 258) {
        doc.addPage();
        y = 20;
        printHeader();
        doc.setFontSize(8);
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${formatDate(movement.rawDate)} · ${movementLabel(movement.type).toUpperCase()} · ${movement.receipt || "Sin comprobante"}`, 18, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(`${movement.concept} · ${movement.detail} · Cargo Bs ${formatBs(movement.charge)} · Pago Bs ${formatBs(movement.payment)} · Saldo Bs ${formatBs(movement.balance)}`, 175);
      doc.text(lines, 18, y);
      y += lines.length * 4 + 4;
    }
    doc.save(`MOVIMIENTOS_${safeFilePart(neighbor.name)}_LOTE_${safeFilePart(neighbor.lot)}.pdf`);
    notify("Estado de cuenta PDF descargado");
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
      const category = activityCategoryFromRowIndex(activity.cardRowIndex);
      const typeDetail = category.id === "otros" ? ` · ${activity.type}` : "";
      doc.text(`${formatDate(activity.date)} · ${category.label}${typeDetail} · ${activity.title} · Bs ${formatBs(activity.fine)}`, 20, y, { maxWidth: 175 });
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
              <button onClick={() => setSection("pagos")}><span>Bs</span><strong>Ver historial</strong><small>Cargos, pagos y comprobantes</small></button>
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
            <SectionIntro title="Vecinos registrados" text="Busque por nombre o lote. Los nombres pueden repetirse, pero cada número de lote real pertenece a un solo registro." action="Registrar vecino" onAction={() => { setEditingNeighborId(null); setShowNeighborForm((value) => !value); }} />
            {showNeighborForm && (
              <form className="inline-form neighbor-form" key={editingNeighbor?.id ?? "new-neighbor"} onSubmit={addNeighbor}>
                <label>Nombre completo<input name="name" defaultValue={editingNeighbor?.name ?? ""} required placeholder="Ej. María Flores" /></label>
                <label>Calle o avenida (puede completar después)<input name="street" defaultValue={editingNeighbor?.street === "POR COMPLETAR" ? "" : editingNeighbor?.street ?? ""} placeholder="Ej. Calle Los Pinos" /></label>
                <label>Número de lote (único; puede completar después)<input name="lot" defaultValue={editingNeighbor?.lot === "—" ? "" : editingNeighbor?.lot ?? ""} placeholder="Ej. 705" /></label>
                <label>Teléfono opcional<input name="phone" defaultValue={editingNeighbor?.phone ?? ""} placeholder="Ej. 70000000" /></label>
                <p className="editor-help">Si todavía no conoce los demás datos, escriba únicamente el nombre y guarde. Después use Editar: el QR ya impreso no cambiará.</p>
                <div className="activity-form-actions">
                  <button type="submit" className="primary-action">{editingNeighbor ? "Guardar corrección" : "Guardar y generar QR"}</button>
                  {editingNeighbor && <button type="button" className="cancel-action" onClick={() => { setEditingNeighborId(null); setShowNeighborForm(false); }}>Cancelar</button>}
                </div>
              </form>
            )}
            <section className="admin-panel">
              <div className="panel-heading"><div><span>{neighborSearch ? `${filteredNeighbors.length} de ${neighbors.length} registros` : `${neighbors.length} registros`}</span><h2>Directorio vecinal</h2></div><button className="yellow-action" onClick={downloadQrPdf}>Descargar PDF de QR</button></div>
              {!!duplicateLotGroups.length && <div className="duplicate-lot-warning" role="alert"><strong>Hay lotes repetidos de registros anteriores.</strong><span>Revise y corrija: {duplicateLotGroups.map((group) => group[0].lot).join(", ")}. El sistema ya no permitirá crear nuevos duplicados.</span></div>}
              <div className="neighbor-search-bar">
                <label htmlFor="neighbor-search"><span>Buscar vecino por nombre o lote</span><input id="neighbor-search" type="search" value={neighborSearch} onChange={(event) => setNeighborSearch(event.target.value)} placeholder="Ej. Mamani o 307" autoComplete="off" /></label>
                {neighborSearch && <button type="button" onClick={() => setNeighborSearch("")}>Limpiar búsqueda</button>}
                <small role="status" aria-live="polite">{neighborSearch ? `${filteredNeighbors.length} ${filteredNeighbors.length === 1 ? "resultado" : "resultados"}` : "Escriba parte del nombre o el número de lote"}</small>
              </div>
              <div className="neighbor-cards">
                {filteredNeighbors.map((neighbor) => <article className="neighbor-card" key={neighbor.id}><QrTile neighbor={neighbor} /><div><span className={`status-dot ${balanceOf(neighbor) ? "has-debt" : "clear"}`}>{balanceOf(neighbor) ? "Pendiente" : "Al día"}</span><h3>{neighbor.name}</h3><p>{neighbor.street} · Lote {neighbor.lot}</p><p>{neighbor.code}</p><div className="neighbor-actions"><button onClick={() => window.open(publicNeighborUrl(neighbor.token), "_blank", "noopener,noreferrer")}>Ver tarjeta</button><button onClick={() => openNeighborAccount(neighbor.id)}>Ver historial</button><button onClick={() => { setEditingNeighborId(neighbor.id); setShowNeighborForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button className="delete-action" onClick={() => void deleteNeighbor(neighbor)}>Eliminar</button></div></div></article>)}
                {!neighbors.length && <div className="empty-state"><strong>Aún no hay vecinos.</strong><span>Pulse “Registrar vecino” para crear el primero y generar su QR.</span></div>}
                {!!neighbors.length && !filteredNeighbors.length && <div className="empty-state"><strong>No se encontró ningún vecino.</strong><span>Revise el nombre o número de lote, o pulse “Limpiar búsqueda”.</span></div>}
              </div>
            </section>
          </div>
        )}
        {section === "padron" && (
          <div className="admin-section">
            <SectionIntro title="Padrón vecinal por calles" text="Revise cuántos vecinos y lotes hay en cada calle, encuentre cualquier registro y descargue el padrón completo o una calle por separado." />
            <div className="summary-grid registry-summary">
              <SummaryCard label="Tarjetas activas" value={String(activeNeighbors.length)} note="Vecinos con QR" tone="blue" />
              <SummaryCard label="Calles registradas" value={String(registeredStreetCount)} note="Sin contar datos provisionales" tone="violet" />
              <SummaryCard label="Lotes registrados" value={String(registeredLots.size)} note="Números únicos" tone="green" />
              <SummaryCard label="Datos por completar" value={String(incompleteNeighborCount)} note="Falta calle o lote" tone={incompleteNeighborCount ? "amber" : "green"} />
            </div>
            <section className="admin-panel registry-panel">
              <div className="panel-heading"><div><span>{registryMatches.length} registro(s) visible(s)</span><h2>Buscar en todo el padrón</h2></div><button className="yellow-action" onClick={() => downloadRegistryCsv()}>Descargar padrón CSV</button></div>
              <div className="neighbor-search-bar registry-search-bar">
                <label htmlFor="registry-search"><span>Nombre, calle, lote o código</span><input id="registry-search" type="search" value={registrySearch} onChange={(event) => setRegistrySearch(event.target.value)} placeholder="Ej. Cochabamba, Mamani, 438 o VEC-001" autoComplete="off" /></label>
                {registrySearch && <button type="button" onClick={() => setRegistrySearch("")}>Limpiar búsqueda</button>}
                <small role="status" aria-live="polite">{registrySearch ? `${registryMatches.length} resultado(s)` : "El padrón se agrupa automáticamente por calle"}</small>
              </div>
              <div className="street-stat-grid">
                {streetGroups.map((group) => <article className="street-stat-card" key={searchableText(group.name)}><div><span>Calle o avenida</span><h3>{group.name}</h3><p>{group.neighbors.length} {group.neighbors.length === 1 ? "vecino" : "vecinos"} · {new Set(group.neighbors.map((neighbor) => normalizedLotKey(neighbor.lot)).filter((lot) => lot && lot !== "—")).size} lote(s)</p></div><button type="button" onClick={() => downloadRegistryCsv(group.neighbors, group.name)}>Descargar</button></article>)}
                {!streetGroups.length && <div className="empty-state compact-empty"><strong>No hay resultados.</strong><span>Revise la búsqueda o complete la calle de los vecinos.</span></div>}
              </div>
              {!!registryMatches.length && <div className="responsive-table registry-table"><table><thead><tr><th>Código</th><th>Vecino</th><th>Calle o avenida</th><th>Lote</th><th>Teléfono</th></tr></thead><tbody>{registryMatches.map((neighbor) => <tr key={neighbor.id}><td>{neighbor.code}</td><td><strong>{neighbor.name}</strong></td><td>{neighbor.street}</td><td>{neighbor.lot}</td><td>{neighbor.phone || "—"}</td></tr>)}</tbody></table></div>}
            </section>
          </div>
        )}
        {section === "actividades" && (
          <div className="admin-section">
            <SectionIntro title="Actividades y cuotas" text="Elija primero el cuadro exacto donde debe aparecer. El nombre del concepto nunca cambiará esa ubicación." action="Crear registro" onAction={() => { setEditingActivityId(null); setActivityFormCategory("asambleas"); setShowActivityForm((value) => !value); }} />
            {showActivityForm && <form className="inline-form activity-form" key={editingActivity?.id ?? "new-activity"} onSubmit={addActivity}>
              <label>Ubicación en la tarjeta
                <select name="category" value={activityFormCategory} onChange={(event) => setActivityFormCategory(event.target.value as ActivityCategoryId)}>
                  {activityCategories.map((category) => <option value={category.id} key={category.id}>{category.label}</option>)}
                </select>
                <small>Este cuadro será respetado aunque cambie el nombre.</small>
              </label>
              {activityFormCategory === "otros" && <label>Tipo de registro
                <input name="customType" defaultValue={editingCustomType || "Marcha / desfile"} required placeholder="Ej. Marcha, desfile o fumigación" />
                <small>Solo se usa dentro del cuadro “Otros”.</small>
              </label>}
              <label className="wide-field">Concepto que verá el vecino
                <input name="title" defaultValue={editingActivity?.title ?? ""} required placeholder={activityFormCategory === "cuotas-extras" ? "Ej. Aporte Casa Cultural" : "Ej. Limpieza de la plaza"} />
              </label>
              <label>Fecha del registro
                <input name="date" type="date" defaultValue={editingActivity?.date ?? today} required />
                <small>En cuotas extras y otros no se usa como nombre del cuadro.</small>
              </label>
              <label>{activityCategoryById(activityFormCategory).kind === "contribution" ? "Monto de la cuota Bs" : "Multa por incumplimiento Bs"}
                <input name="fine" type="number" min="0" step="0.01" defaultValue={editingActivity?.fine ?? 50} required />
              </label>
              <div className="activity-form-actions"><button type="submit" className="primary-action">{editingActivity ? "Guardar corrección" : "Guardar registro"}</button>{editingActivity && <button type="button" className="cancel-action" onClick={() => { setEditingActivityId(null); setActivityFormCategory("asambleas"); setShowActivityForm(false); }}>Cancelar</button>}</div>
            </form>}
            <div className="category-location-note"><strong>Importante:</strong> si un registro antiguo está en el cuadro equivocado, pulse “Editar”, elija su ubicación correcta y guarde. No necesita volver a crearlo.</div>
            {activitiesToReview.length > 0 && <div className="category-review-warning" role="status"><strong>Hay {activitiesToReview.length} registro(s) en “Otros” que conviene revisar.</strong><span>{activitiesToReview.map(({ activity, suggestion }) => `${activity.title} → ${suggestion.label}`).join(" · ")}</span><small>Pulse “Editar” en cada registro, confirme la ubicación sugerida y guarde.</small></div>}
            <div className="activity-list">{activities.map((activity) => {
              const category = activityCategoryFromRowIndex(activity.cardRowIndex);
              const contribution = category.kind === "contribution";
              return <article key={activity.id}><div className="activity-date"><strong>{new Date(`${activity.date}T00:00:00`).getUTCDate()}</strong><span>{new Intl.DateTimeFormat("es-BO", { month: "short", timeZone: "UTC" }).format(new Date(`${activity.date}T00:00:00Z`))}</span></div><div className="activity-main"><span>{category.label} · {activity.code}</span><h3>{activity.title}</h3><p>{contribution ? "Cuota configurada" : "Multa configurada"}: <strong>Bs {formatBs(activity.fine)}</strong>{category.id === "otros" && <> · {activity.type}</>}</p></div><span className={`activity-status ${activity.status === "Cerrada" ? "closed" : "scheduled"}`}>{activity.status}</span><div className="activity-actions"><button className="ghost-action" onClick={() => { const suggestion = suggestedCategoryForActivity(activity); setEditingActivityId(activity.id); setActivityFormCategory(suggestion?.id ?? category.id); setShowActivityForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button className="ghost-action" onClick={() => { setSelectedActivity(activity.id); setSection("asistencia"); }}>{contribution ? "Registrar pagos →" : category.id === "trabajos" ? "Cumplimiento →" : "Asistencia →"}</button><button className="delete-action" onClick={() => void deleteActivity(activity)}>Eliminar</button></div></article>;
            })}{!activities.length && <div className="empty-state"><strong>Aún no hay actividades.</strong><span>Cree una asamblea, cuota, trabajo u otro evento para comenzar.</span></div>}</div>
          </div>
        )}
        {section === "asistencia" && (
          <div className="admin-section">
            <SectionIntro title={selectedActivityIsContribution ? "Registrar quién pagó" : "Registrar asistencia o cumplimiento"} text={selectedActivityIsContribution ? "Marque Pagó o No pagó. Al guardar, el monto completo se registra automáticamente en el historial; no existen pagos incompletos." : "Revise cada vecino. Si una falta con multa fue pagada, marque Regularizó para guardar automáticamente el movimiento completo."} />
            {!selectedActivityData ? <div className="empty-state"><strong>Primero debe crear una actividad.</strong><span>Después podrá marcar presentes, faltas o justificaciones.</span></div> : (
              <section className="admin-panel attendance-panel"><div className="attendance-select"><label>Registro<select value={selectedActivity} onChange={(event) => setSelectedActivity(Number(event.target.value))}>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activityCategoryFromRowIndex(activity.cardRowIndex).label} · {activity.title}</option>)}</select></label><div><span>{selectedActivityIsContribution ? "Monto de la cuota" : "Multa configurada"}</span><strong>Bs {formatBs(selectedActivityData.fine)}</strong><small>{selectedActivityCategory.label}</small></div></div>
                <div className="status-meaning-note"><strong>{selectedActivityIsContribution ? "Control de cuota" : "Control de actividad"}</strong><span>{selectedActivityIsContribution ? "✓ pagó · × no pagó · — exento" : "✓ cumplió · × pendiente · ✓ regularizó · — justificado"}</span></div>
                <div className="bulk-control-actions"><div><strong>Atajo para listas grandes</strong><span>Marque a todos y luego corrija únicamente las excepciones.</span></div><div>{selectedStatusOptions.filter((option) => option.value === "Presente" || option.value === "Faltó").map((option) => <button type="button" key={`all-${option.value}`} onClick={() => setAllControlStatus(option.value)}>Todos: {option.label.replace(/^.[ ]*/, "")}</button>)}<button type="button" className="clear-bulk" onClick={() => setAllControlStatus("Sin registrar")}>Limpiar selección</button></div></div>
                <div className="neighbor-search-bar control-search-bar"><label htmlFor="control-search"><span>Buscar dentro de la lista</span><input id="control-search" type="search" value={controlSearch} onChange={(event) => setControlSearch(event.target.value)} placeholder="Nombre, calle, lote o código" autoComplete="off" /></label>{controlSearch && <button type="button" onClick={() => setControlSearch("")}>Mostrar todos</button>}<small>{controlSearch ? `${controlNeighbors.length} de ${activeNeighbors.length} vecino(s)` : `${activeNeighbors.length} vecino(s) en este control`}</small></div>
                <div className="attendance-list">{controlNeighbors.map((neighbor) => { const currentStatus = selectedAttendance[neighbor.id] ?? "Sin registrar"; return <article className={currentStatus === "Sin registrar" ? "unregistered" : ""} key={neighbor.id}><div className="avatar">{neighbor.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div className="attendance-name"><strong>{neighbor.name}</strong><span>Lote {neighbor.lot} · {neighbor.code}{currentStatus === "Sin registrar" ? " · Falta elegir" : ""}</span></div><div className="attendance-buttons">{selectedStatusOptions.map((option) => <button type="button" key={option.value} className={currentStatus === option.value ? `selected ${option.value.toLowerCase().replace("ó", "o")}` : ""} onClick={() => setAttendanceByActivity((current) => ({ ...current, [selectedActivity]: { ...(current[selectedActivity] ?? {}), [neighbor.id]: option.value } }))}>{option.label}</button>)}</div></article>; })}</div>
                {!neighbors.length && <div className="empty-state"><strong>No hay vecinos activos.</strong><span>Registre vecinos antes de guardar asistencia.</span></div>}
                <div className="attendance-footer"><p><strong>{selectedUnregisteredCount ? `${selectedUnregisteredCount} falta(n) por elegir` : `${selectedPendingCount} registro(s) con ×`}</strong> · ✓ guardará el pago completo y el historial automáticamente.</p><button className="primary-action" disabled={!activeNeighbors.length || selectedUnregisteredCount > 0} onClick={() => void saveAttendance()}>{selectedUnregisteredCount ? "Complete toda la lista" : "Guardar control, historial y tarjeta"}</button></div>
              </section>
            )}
          </div>
        )}
        {section === "pagos" && (
          <div className="admin-section">
            <SectionIntro title="Historial de movimientos" text="Los cargos y pagos completos se guardan automáticamente desde Control por vecino. Aquí puede buscar, revisar y descargar el historial de cada persona." />
            <section className="admin-panel payment-neighbor-panel">
              <div className="panel-heading"><div><span>Paso 1</span><h2>Buscar vecino</h2></div><button onClick={downloadIncomeLedgerCsv}>Descargar libro general CSV</button></div>
              <div className="payment-neighbor-fields">
                <label>Buscar por nombre, lote o código<input type="search" value={paymentNeighborSearch} onChange={(event) => setPaymentNeighborSearch(event.target.value)} placeholder="Ej. Mamani, 307 o VEC-001" /></label>
                <label>Vecino<select value={selectedPaymentNeighborId ?? ""} onChange={(event) => choosePaymentNeighbor(event.target.value ? Number(event.target.value) : null)}><option value="">Seleccione un vecino</option>{paymentNeighborOptions.map((neighbor) => <option key={neighbor.id} value={neighbor.id}>{neighbor.code} · {neighbor.name} · Lote {neighbor.lot}</option>)}</select></label>
              </div>
            </section>
            {!neighbors.length ? <div className="empty-state payment-empty"><strong>No hay vecinos registrados.</strong><span>Registre al primer vecino para comenzar.</span></div> : !selectedPaymentNeighbor ? <div className="empty-state payment-empty"><strong>Seleccione un vecino para abrir su historial.</strong><span>Verá todos sus cargos, pagos y resultados guardados.</span></div> : <>
              <div className="summary-grid payment-account-summary">
                <SummaryCard label="Generado" value={`Bs ${formatBs(selectedPaymentNeighbor.generated)}`} note="Cargos registrados" tone="blue" />
                <SummaryCard label="Pagado" value={`Bs ${formatBs(selectedPaymentNeighbor.paid)}`} note="Dinero recibido" tone="green" />
                <SummaryCard label="Saldo" value={`Bs ${formatBs(balanceOf(selectedPaymentNeighbor))}`} note={balanceOf(selectedPaymentNeighbor) ? "Pendiente" : "Al día"} tone={balanceOf(selectedPaymentNeighbor) ? "amber" : "green"} />
              </div>
              <section className="automatic-control-help"><div><span>✓</span><div><strong>Registro automático, sin pagos parciales</strong><p>Para cambiar un resultado, abra “Control por vecino”, elija la actividad y marque Pagó, No pagó, Asistió, No asistió o Regularizó.</p></div></div><button onClick={() => setSection("asistencia")}>Ir al control →</button></section>
              <section className="admin-panel account-movements">
                <div className="panel-heading"><div><span>{selectedAccountMovements.length} movimientos</span><h2>Movimientos de {selectedPaymentNeighbor.name}</h2></div><div className="movement-actions"><button onClick={() => downloadNeighborMovementsCsv(selectedPaymentNeighbor, selectedAccountMovements)}>Descargar CSV</button><button onClick={() => void downloadNeighborMovementsPdf(selectedPaymentNeighbor, selectedAccountMovements)}>Descargar PDF</button></div></div>
                {selectedAccountMovements.length ? <div className="responsive-table"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Concepto</th><th>Comprobante</th><th>Cargo</th><th>Pago</th><th>Saldo</th></tr></thead><tbody>{selectedAccountMovements.map((movement) => <tr key={movement.key}><td>{formatDate(movement.rawDate)}</td><td><span className={`movement-kind ${movement.type}`}>{movementLabel(movement.type)}</span></td><td><strong>{movement.concept}</strong><small>{movement.detail}</small></td><td>{movement.receipt || "—"}</td><td>{movement.charge ? `Bs ${formatBs(movement.charge)}` : "—"}</td><td>{movement.payment ? <span className="paid-pill">Bs {formatBs(movement.payment)}</span> : "—"}</td><td><strong>Bs {formatBs(movement.balance)}</strong></td></tr>)}</tbody></table></div> : <div className="empty-state compact-empty"><strong>Aún no hay movimientos.</strong><span>Los estados, cargos y pagos aparecerán aquí.</span></div>}
              </section>
            </>}
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
            <div className="notice-admin-grid">
              <form className="notice-form" onSubmit={publishNotice}>
                <div className="form-two-cols">
                  <label>Tipo de evento<select name="eventType" defaultValue={notice.eventType}><option>Asamblea general</option><option>Marcha o desfile</option><option>Trabajo comunitario</option><option>Otro evento</option></select></label>
                  <label>Título<input name="title" defaultValue={notice.title} required /></label>
                </div>
                <div className="form-three-cols">
                  <label>Fecha<input name="eventDate" type="date" defaultValue={notice.eventDate} required /></label>
                  <label>Hora<input name="eventTime" type="time" defaultValue={notice.eventTime} required /></label>
                  <label>Lugar<input name="eventPlace" defaultValue={notice.eventPlace} required /></label>
                </div>
                <label>Descripción<textarea name="body" defaultValue={notice.body} rows={3} required /></label>
                <label>WhatsApp de la directiva<input name="whatsapp" defaultValue={notice.whatsapp} inputMode="tel" placeholder="Ej. 59170000000" /></label>
                <label>Fotografía del anuncio<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void selectNoticeImage(event.target.files?.[0])} /><small>{noticeImageBusy ? "Preparando fotografía…" : "Puede elegir una imagen JPG, PNG o WEBP de hasta 10 MB."}</small></label>
                <button className="primary-action" type="submit" disabled={noticeImageBusy}>{noticeImageBusy ? "Preparando fotografía…" : "Publicar aviso"}</button>
              </form>
              <article className="notice-preview"><span>Vista previa del vecino</span><div className="notice-photo" style={notice.image ? { backgroundImage: `url(${notice.image})` } : undefined}>{!notice.image && <><strong>U.V. 4-O</strong><small>Aviso vecinal</small></>}</div><div><b>{notice.eventType}</b><h3>{notice.title}</h3><p>{formatDate(notice.eventDate)} · {notice.eventTime} · {notice.eventPlace}</p></div></article>
            </div>
          </div>
        )}
        {section === "reportes" && (
          <div className="admin-section">
            <SectionIntro title="Reportes y respaldos" text="Descargue documentos listos para imprimir y copias editables para su archivo mensual." />
            <div className="report-grid"><article className="report-card featured"><span>QR</span><h2>Todos los QR de vecinos</h2><p>Hoja carta con hasta 35 etiquetas por página. Cada recuadro mide exactamente 3,7 cm de ancho × 3,8 cm de alto; el QR ocupa casi todo el espacio y solo lleva el nombre pequeño debajo.</p><button className="yellow-action" onClick={downloadQrPdf}>Descargar PDF de QR grandes</button></article><article className="report-card"><span>CSV</span><h2>Reporte de deudores</h2><p>Listado actualizado de vecinos con saldo pendiente.</p><button onClick={downloadDebtorsCsv}>Descargar deudores</button></article><article className="report-card"><span>Bs</span><h2>Libro general de ingresos</h2><p>Todos los pagos, comprobantes, vecinos, conceptos y métodos registrados.</p><button onClick={downloadIncomeLedgerCsv}>Descargar ingresos CSV</button></article><article className="report-card"><span>▦</span><h2>Padrón completo</h2><p>Vecinos, calles, lotes, teléfonos y códigos en una tabla editable.</p><button onClick={() => downloadRegistryCsv()}>Descargar padrón CSV</button></article><article className="report-card"><span>PDF</span><h2>Resumen mensual</h2><p>Actividades, multas generadas y pagos del mes actual.</p><button onClick={() => void downloadMonthlySummary()}>Generar resumen</button></article><article className="report-card"><span>↺</span><h2>Respaldo completo</h2><p>Copia de vecinos, actividades, asistencias, pagos, avisos y configuración.</p><button onClick={downloadFullBackup}>Descargar respaldo</button></article></div>
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

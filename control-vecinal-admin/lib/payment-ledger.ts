export type AllocatableCharge = {
  activityId: number;
  amount: number;
  order?: number;
};

export type AllocatablePayment = {
  receipt: string;
  amount: number;
};

export type ChargeAllocation = {
  activityId: number;
  charged: number;
  paid: number;
  balance: number;
  exactPaid: number;
  legacyPaid: number;
};

/**
 * Los comprobantes nuevos terminan en -A<id de actividad>. De esta forma el
 * pago queda unido a un concepto sin alterar la tabla histórica de pagos.
 * Los comprobantes anteriores, que no tienen sufijo, continúan como pagos
 * generales y se aplican en el orden estable de creación de las actividades.
 */
export function activityIdFromReceipt(receipt: string) {
  const match = /-A(\d+)$/.exec(String(receipt ?? "").trim());
  if (!match) return null;
  const activityId = Number(match[1]);
  return Number.isSafeInteger(activityId) && activityId > 0 ? activityId : null;
}

export function receiptForPayment(paymentId: number, activityId?: number | null) {
  const base = `REC-${String(paymentId).padStart(5, "0")}`;
  return activityId ? `${base}-A${activityId}` : base;
}

export function paymentNoteForStorage(method: string, note: string) {
  const safeMethod = String(method || "No especificado").replaceAll("[", " ").replaceAll("]", " ").replace(/[\r\n]/g, " ").trim() || "No especificado";
  const safeNote = String(note || "").replace(/[\r\n]+/g, " ").trim();
  return `[MEDIO:${safeMethod}]${safeNote ? ` ${safeNote}` : ""}`;
}

export function readStoredPaymentNote(value: string) {
  const stored = String(value || "").trim();
  const match = /^\[MEDIO:([^\]]+)\]\s*/.exec(stored);
  if (!match) return { method: "No especificado", note: stored };
  return {
    method: match[1].trim() || "No especificado",
    note: stored.slice(match[0].length).trim(),
  };
}

export function allocatePayments(charges: AllocatableCharge[], payments: AllocatablePayment[]) {
  const exactByActivity = new Map<number, number>();
  let legacyAvailable = 0;

  for (const payment of payments) {
    const amount = Math.max(0, Number(payment.amount) || 0);
    const activityId = activityIdFromReceipt(payment.receipt);
    if (activityId) exactByActivity.set(activityId, (exactByActivity.get(activityId) ?? 0) + amount);
    else legacyAvailable += amount;
  }

  return [...charges]
    .sort((first, second) => (first.order ?? first.activityId) - (second.order ?? second.activityId))
    .map<ChargeAllocation>((charge) => {
      const charged = Math.max(0, Number(charge.amount) || 0);
      const exactPaid = Math.min(charged, exactByActivity.get(charge.activityId) ?? 0);
      const afterExact = Math.max(0, charged - exactPaid);
      const legacyPaid = Math.min(afterExact, legacyAvailable);
      legacyAvailable -= legacyPaid;
      const paid = exactPaid + legacyPaid;
      return {
        activityId: charge.activityId,
        charged,
        paid,
        balance: Math.max(0, charged - paid),
        exactPaid,
        legacyPaid,
      };
    });
}

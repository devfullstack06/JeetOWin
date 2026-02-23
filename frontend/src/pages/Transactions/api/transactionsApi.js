// Mock/localStorage now; replace with real HTTP later.

const LS_KEY = "jw_transactions_tickets_v1";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeStore(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix = "T") {
  const rand = Math.floor(Math.random() * 1e9).toString().padStart(9, "0");
  return `${prefix}${rand}`;
}

export async function createDepositTicket(payload) {
  // payload: { walletCompanyName, accountTitle, accountNumber, amount, slipUrl }
  const ticket = {
    id: newId("D"),
    type: "DEPOSIT",
    status: "PROCESSING",
    createdAt: nowIso(),
    walletCompanyName: payload.walletCompanyName,
    accountTitle: payload.accountTitle,
    accountNumber: payload.accountNumber,
    amount: Number(payload.amount),
    slipUrl: payload.slipUrl || null,
    reason: null,
    approvedAt: null,
    rejectedAt: null,
  };

  const store = readStore();
  store.unshift(ticket);
  writeStore(store);

  return { ticket };
}

export async function createWithdrawTicket(payload) {
  // payload: { walletCompanyName, accountTitle, accountNumber, amount }
  const ticket = {
    id: newId("W"),
    type: "WITHDRAW",
    status: "PROCESSING",
    createdAt: nowIso(),
    walletCompanyName: payload.walletCompanyName,
    accountTitle: payload.accountTitle,
    accountNumber: payload.accountNumber,
    amount: Number(payload.amount),
    slipUrl: null,
    reason: null,
    approvedAt: null,
    rejectedAt: null,
  };

  const store = readStore();
  store.unshift(ticket);
  writeStore(store);

  return { ticket };
}

export async function fetchTransactionTicket(ticketId) {
  const store = readStore();
  const found = store.find((t) => t.id === ticketId);
  if (!found) throw new Error("Ticket not found.");
  return { ticket: found };
}

/**
 * DEV helper (optional): manually update ticket status from console later.
 * window.jwDevSetTicketStatus("D123...", "APPROVED")
 */
export function devSetTicketStatus(ticketId, status, reason = "") {
  const store = readStore();
  const idx = store.findIndex((t) => t.id === ticketId);
  if (idx < 0) return false;

  const t = store[idx];
  const next = { ...t, status };

  if (status === "APPROVED") {
    next.approvedAt = nowIso();
    next.rejectedAt = null;
    next.reason = null;
  } else if (status === "REJECTED") {
    next.rejectedAt = nowIso();
    next.approvedAt = null;
    next.reason = reason || "Rejected by admin";
  }

  store[idx] = next;
  writeStore(store);
  return true;
}

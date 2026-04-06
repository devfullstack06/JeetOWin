// frontend/src/pages/Accounts/api/accountsApi.js
import { apiFetch } from "../../../services/api";

/**
 * Accounts API (client-side)
 * All endpoints assumed under /api/accounts/*
 */

export async function fetchBrands() {
  return apiFetch("/api/accounts/brands");
}

export async function fetchMyAccounts() {
  return apiFetch("/api/accounts");
}

export async function fetchPendingTicketsCount() {
  return apiFetch("/api/accounts/tickets/pending-count");
}

/** Pending account tickets only (for table). */
export async function fetchPendingAccountTickets() {
  return apiFetch("/api/accounts/tickets");
}

export async function createAccountTicket({ brand, suggestedUsername }) {
  return apiFetch("/api/accounts/tickets", {
    method: "POST",
    body: JSON.stringify({ brand, suggestedUsername }),
  });
}

export async function fetchTicketStatus(ticketId) {
  return apiFetch(`/api/accounts/tickets/${encodeURIComponent(ticketId)}`);
}
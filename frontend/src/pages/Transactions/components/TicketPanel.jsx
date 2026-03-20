import React from "react";

export default function TicketPanel({
  statusTitle,
  statusText,
  ticket,
  showSlip,
  onOpenSlip,
}) {
  const rows = [];

  if (ticket?.status === "PROCESSING") rows.push(["Created at:", fmt(ticket.createdAt)]);
  if (ticket?.status === "APPROVED") rows.push(["Approved at:", fmt(ticket.approvedAt)]);
  if (ticket?.status === "REJECTED") rows.push(["Rejected at:", fmt(ticket.rejectedAt)]);

  rows.push(["Ticket No.:", ticket?.id || "-"]);
  rows.push([
    "Created by:",
    ticket?.createdByUsername ? String(ticket.createdByUsername) : "-",
  ]);
  rows.push(["Transaction:", ticket?.type === "WITHDRAW" ? "Withdraw" : "Deposit"]);
  rows.push(["Wallet:", ticket?.walletCompanyName || "-"]);
  rows.push(["Name:", ticket?.accountTitle || "-"]);
  rows.push(["Number:", ticket?.accountNumber || "-"]);
  rows.push(["Amount:", ticket?.amount ? Number(ticket.amount).toLocaleString() : "-"]);
  rows.push(["Status:", ticket?.status || "-"]);

  if (ticket?.status === "REJECTED") {
    rows.push(["Reason:", ticket?.reason || "-"]);
  }

  return (
    <div className="jw-txTicketPanel">
      <div className="jw-txTicketTop">
        <div className="jw-txTicketStatusTitle">{statusTitle}</div>
        <div className="jw-txTicketStatusText">{statusText}</div>
      </div>

      <div className="jw-txTicketRows">
        {rows.map(([k, v]) => (
          <div className="jw-txTicketRow" key={k}>
            <div className="jw-txTicketKey">{k}</div>
            <div className="jw-txTicketVal">{v}</div>
          </div>
        ))}

        {showSlip && (
          <div className="jw-txTicketRow">
            <div className="jw-txTicketKey">Slip:</div>
            <div className="jw-txTicketVal">
              <button type="button" className="jw-txSlipBtn" onClick={onOpenSlip}>
                Deposit Slip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} :: ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

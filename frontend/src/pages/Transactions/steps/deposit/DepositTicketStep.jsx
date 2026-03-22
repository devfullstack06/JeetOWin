import React from "react";
import TicketPanel from "../../components/TicketPanel";

export default function DepositTicketStep({ labelText, step, ticket, onClose, onOpenSlip }) {
  const isProcessing = step === "process";
  const isApproved = step === "approved";
  const isRejected = step === "rejected";
  const processMins = ticket?.depositProcessMinutes ?? 10;

  const statusTitle = isProcessing ? "Processing..." : isApproved ? "Approved" : "Rejected";

  const statusText = isProcessing
    ? `Your Deposit request is in process, please wait. Estimated time of this transaction is ${processMins} mins.`
    : isApproved
      ? "Your Deposit is approved. Please refresh to check your Balance."
      : "Your Deposit is rejected. Please contact our Customer Support for further details.";

  return (
    <div className="jw-txStep">
      {/* ✅ Section label shown on ticket steps */}
      <div className="jw-transactionsSectionLabel" aria-hidden="true">
        <span className="jw-transactionsLine" />
        <span className="jw-transactionsLabelText">{labelText}</span>
        <span className="jw-transactionsLine" />
      </div>

      <TicketPanel
        statusTitle={statusTitle}
        statusText={statusText}
        ticket={ticket}
        showSlip={true}
        onOpenSlip={onOpenSlip}
      />

      <div className="jw-txActionsCenter">
        <button type="button" className="jw-txBtn is-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

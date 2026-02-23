import React from "react";
import TicketPanel from "../../components/TicketPanel";

export default function WithdrawTicketStep({ labelText, step, ticket, onClose }) {
  const isProcessing = step === "process";
  const isApproved = step === "approved";
  const isRejected = step === "rejected";

  const statusTitle = isProcessing ? "Processing..." : isApproved ? "Approved" : "Rejected";

  const statusText = isProcessing
    ? "Your Withdraw request is in process, please wait. Estimated time of this transaction is 30mins."
    : isApproved
      ? "Your Withdraw is approved. Please check your provided account."
      : "Your Withdraw is rejected. Please contact our Customer Support for further details.";

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
        showSlip={false}
      />

      <div className="jw-txActionsCenter">
        <button type="button" className="jw-txBtn is-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

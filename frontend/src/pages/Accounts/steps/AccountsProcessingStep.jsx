import React from "react";

function formatTicketDate(value) {
  if (value == null) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function AccountsProcessingStep({ ticket, onBack }) {
  const ticketId = ticket?.ticketId;
  const createdAt = ticket?.createdAt;
  const brand = ticket?.brand;
  const username = ticket?.username;
  const status = ticket?.status;

  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Ticket Created</div>

          <div className="jw-processingDetails">
            <div className="jw-processingDetailRow">Ticket ID: <span className="jw-processingDetailValue">{ticketId ?? "—"}</span></div>
            <div className="jw-processingDetailRow">Created at: <span className="jw-processingDetailValue">{formatTicketDate(createdAt)}</span></div>
            <div className="jw-processingDetailRow">Brand: <span className="jw-processingDetailValue">{brand ?? "—"}</span></div>
            <div className="jw-processingDetailRow">Username: <span className="jw-processingDetailValue">{username ?? "—"}</span></div>
            <div className="jw-processingDetailRow">Status: <span className="jw-processingDetailValue">{status ?? "—"}</span></div>
          </div>

          <div className="jw-waitingText">
            Your request has been sent to our admin team.
            <br />
            We&apos;ll update your ticket with the username &amp; password on My Accounts page.
            <br />
            Processing time: 15mins.
          </div>
        </div>

        <div className="jw-waitingActions">
          <button
            type="button"
            className="jw-btn jw-btnCancel"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

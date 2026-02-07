import React from "react";

export default function AccountsProcessingStep({ ticketId, onBack }) {
  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        {/* ✅ TOP CONTENT */}
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Ticket created ✅</div>

          <div className="jw-waitingText">
            Your request has been sent to our admin team.
            <br />
            We’ll update your ticket with the username & password soon.
          </div>

          {ticketId && (
            <div className="jw-ticketId">
              Ticket ID: <span className="jw-ticketIdValue">{ticketId}</span>
            </div>
          )}
        </div>

        {/* ✅ BOTTOM ACTION */}
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

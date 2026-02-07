import React from "react";

export default function AccountsRejectedStep({ reason, onGoToList }) {
  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        {/* ✅ TOP CONTENT */}
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Request rejected ❌</div>

          <div className="jw-waitingText">
            Your request was rejected by the admin team.
          </div>

          {reason && (
            <div className="jw-rejectReason">
              Reason: <span className="jw-rejectReasonValue">{reason}</span>
            </div>
          )}
        </div>

        {/* ✅ BOTTOM ACTION */}
        <div className="jw-waitingActions">
          <button
            type="button"
            className="jw-btn jw-btnCancel"
            onClick={onGoToList}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

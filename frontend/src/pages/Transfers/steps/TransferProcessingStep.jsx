import React from "react";

export default function TransferProcessingStep({ ticket, onBack }) {
  const t = ticket || {};

  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Processing...</div>
          <div className="jw-waitingText">
            Your requested Transfer is in process, please wait.
            <br />
            Estimated time of this transfer is 10mins.
          </div>

          <div className="jw-transferDetails">
            <div className="jw-transferDetailRow">
              <div>Created at:</div>
              <div className="jw-transferDetailValue">{t.createdAt || "-"}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Ticket:</div>
              <div className="jw-transferDetailValue">{t.ticket || "-"}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Transfer:</div>
              <div className="jw-transferDetailValue">{t.transfer || "-"}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Brand:</div>
              <div className="jw-transferDetailValue">{t.brand || "-"}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Username:</div>
              <div className="jw-transferDetailValue">{t.username || "-"}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Amount:</div>
              <div className="jw-transferDetailValue">{t.amount || "-"}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Status:</div>
              <div className="jw-transferDetailValue">Processing</div>
            </div>
          </div>
        </div>

        <div className="jw-waitingActions">
          <button type="button" className="jw-btn jw-btnCancel" onClick={onBack}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

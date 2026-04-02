import React from "react";
import { formatAdminDateTime } from "../../../admin/utils/adminDateUtils";
import { formatTransferAmountPk, formatTransferClientAccountUsername } from "../transferAmountFormat";

export default function TransferCompletedStep({ ticket, onGoToHistory }) {
  const t = ticket || {};

  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Completed</div>
          <div className="jw-waitingText">
            Your Transfer is Completed. Please login to your concerned account to verify the transferred amount.
          </div>

          <div className="jw-transferDetails">
            <div className="jw-transferDetailRow">
              <div>Created at:</div>
              <div className="jw-transferDetailValue jw-transferDetailValue--dateLikeAdmin">
                {formatAdminDateTime(t.createdAt)}
              </div>
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
              <div>Account:</div>
              <div className="jw-transferDetailValue">{formatTransferClientAccountUsername(t)}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Amount:</div>
              <div className="jw-transferDetailValue">{formatTransferAmountPk(t.amount)}</div>
            </div>
            <div className="jw-transferDetailRow">
              <div>Status:</div>
              <div className="jw-transferDetailValue">Completed</div>
            </div>
          </div>
        </div>

        <div className="jw-waitingActions">
          <button type="button" className="jw-btn jw-btnCancel" onClick={onGoToHistory}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { formatAdminDateTime } from "../../../admin/utils/adminDateUtils";
import { formatTransferAmountPk, formatTransferClientAccountUsername } from "../transferAmountFormat";

export default function TransferProcessingStep({ ticket, onBack }) {
  const t = ticket || {};
  const dir = String(t.transfer || "").trim().toUpperCase();
  const inM =
    t.inProcessMinutes != null && Number.isFinite(Number(t.inProcessMinutes)) && Number(t.inProcessMinutes) >= 1
      ? Math.floor(Number(t.inProcessMinutes))
      : t.in_process_minutes != null && Number.isFinite(Number(t.in_process_minutes)) && Number(t.in_process_minutes) >= 1
        ? Math.floor(Number(t.in_process_minutes))
        : 15;
  const outM =
    t.outProcessMinutes != null && Number.isFinite(Number(t.outProcessMinutes)) && Number(t.outProcessMinutes) >= 1
      ? Math.floor(Number(t.outProcessMinutes))
      : t.out_process_minutes != null && Number.isFinite(Number(t.out_process_minutes)) && Number(t.out_process_minutes) >= 1
        ? Math.floor(Number(t.out_process_minutes))
        : 15;
  const estimatedMins = dir === "OUT" ? outM : inM;

  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Processing...</div>
          <div className="jw-waitingText">
            Your requested Transfer is in process, please wait.
            <br />
            Estimated time of this transfer is {estimatedMins}mins.
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

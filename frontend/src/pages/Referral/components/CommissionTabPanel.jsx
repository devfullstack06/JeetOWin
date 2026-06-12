import React from "react";
import { formatReferralAmount } from "../../../services/referralApi";

export default function CommissionTabPanel({ overall, rows }) {
  return (
    <div className="jw-refPanelContent">
      <div className="jw-refSectionHead">
        <h3 className="jw-refSectionTitle">Overall</h3>
        <p className="jw-refSectionSub">Overall Stats of Referral Commission</p>
      </div>

      <div className="jw-refCommissionSummary">
        <div className="jw-refCommissionRow jw-refCommissionRow--earned">
          <span className="jw-refCommissionLabel">Earned</span>
          <span className="jw-refCommissionValue">{formatReferralAmount(overall.earned)}</span>
        </div>
        <div className="jw-refCommissionRow jw-refCommissionRow--withdrawn">
          <span className="jw-refCommissionLabel">Withdrawn</span>
          <span className="jw-refCommissionValue">{formatReferralAmount(overall.withdrawn)}</span>
        </div>
        <div className="jw-refCommissionDivider" aria-hidden="true" />
        <div className="jw-refCommissionRow jw-refCommissionRow--balance">
          <span className="jw-refCommissionLabel">Balance</span>
          <span className="jw-refCommissionValue">{formatReferralAmount(overall.balance)}</span>
        </div>
      </div>

      <div className="jw-refTableWrap">
        <div className="jw-refTableHead jw-refTableHead--2" aria-hidden="true">
          <span>Month</span>
          <span>Comm.</span>
        </div>

        <div className="jw-refTableRows">
          {rows.map((row) => (
            <div key={row.id} className="jw-refTableRow jw-refTableRow--2">
              <span className="jw-refTableCell">{row.month}</span>
              <span className="jw-refTableCell jw-refTableCell--right">{formatReferralAmount(row.commission)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

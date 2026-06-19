import React from "react";
import CommissionTabPanel from "../../../pages/Referral/components/CommissionTabPanel";
import ReferralTabPanel from "../../../pages/Referral/components/ReferralTabPanel";
import "../../../pages/Referral/referralBody.css";

export default function ReferrerCommissionModal({
  open,
  username,
  loading,
  referralStatsLoading,
  errorText,
  overall,
  commissionRows,
  referralSummary,
  referralRows,
  referralMonthLabel,
  referralTierFilter,
  onReferralTierFilterChange,
  referralDownline,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminRefCommissionModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jw-admin-ref-commission-title"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title" id="jw-admin-ref-commission-title">
            Referrer: {username || "—"}
          </div>
        </div>

        <div className="jw-adminUsersModal__body jw-adminRefCommissionModal__body">
          {loading ? (
            <div className="jw-adminUserViewLoading">Loading…</div>
          ) : errorText ? (
            <div className="jw-adminUsersModal__error">{errorText}</div>
          ) : (
            <>
              <div className="jw-adminRefCommissionPanel">
                <CommissionTabPanel overall={overall || {}} rows={commissionRows || []} />
              </div>

              <div className="jw-adminRefCommissionPanel jw-adminRefReferralPanel">
                {referralStatsLoading ? (
                  <div className="jw-adminRefReferralPanel__loading">Updating referral stats…</div>
                ) : null}
                <ReferralTabPanel
                  summary={referralSummary || {}}
                  rows={referralRows || []}
                  monthLabel={referralMonthLabel}
                  tierFilter={referralTierFilter}
                  onTierFilterChange={onReferralTierFilterChange}
                  downline={referralDownline}
                  showReferralDetails
                />
              </div>
            </>
          )}
        </div>

        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

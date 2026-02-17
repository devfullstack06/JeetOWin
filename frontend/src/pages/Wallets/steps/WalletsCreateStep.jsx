import React from "react";
import { ChevronDown } from "lucide-react";

export default function WalletsCreateStep({
  companies = [],
  walletCompanyId,
  setWalletCompanyId,
  accountTitle,
  setAccountTitle,
  accountNumber,
  setAccountNumber,
  errors = {},
  onCancel = () => {},
  onSubmit = () => {},
  onClose = () => {},
}) {
  return (
    <div className="jw-walletFormOuter">
      <div className="jw-walletFormPanel">
        <div className="jw-walletFormIntro">
          <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
            Input Details
          </div>
          <div>Input details below to Add your new Wallet Account</div>
        </div>

        <form className="jw-accountsForm" onSubmit={onSubmit}>
          <div className="jw-accountsFormFields">
            <div className="jw-field">
              <div className="jw-selectWrap">
                <select
                  className="jw-select"
                  value={walletCompanyId}
                  onChange={(e) => setWalletCompanyId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Company
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="jw-selectIcon" aria-hidden="true">
                  <ChevronDown size={18} />
                </span>
              </div>
              {errors.walletCompanyId && <div className="jw-fieldError">{errors.walletCompanyId}</div>}
            </div>

            <div className="jw-field">
              <input
                className="jw-input"
                placeholder="Enter Account Title"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                inputMode="text"
              />
              {errors.accountTitle && <div className="jw-fieldError">{errors.accountTitle}</div>}
            </div>

            <div className="jw-field">
              <input
                className="jw-input"
                placeholder="Enter Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
              />
              {errors.accountNumber && <div className="jw-fieldError">{errors.accountNumber}</div>}
            </div>
          </div>

          <div className="jw-accountsFormActions">
            <button type="button" className="jw-btn jw-btnCancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="jw-btn jw-btnSubmit">
              Add
            </button>
          </div>

          {/* X behavior in create: list */}
          <button type="button" style={{ display: "none" }} onClick={onClose} aria-hidden="true" />
        </form>
      </div>
    </div>
  );
}

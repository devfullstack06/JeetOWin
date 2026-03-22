import React, { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCompany = companies.find((c) => String(c.id) === String(walletCompanyId)) ?? null;
  const displayName = selectedCompany?.name ?? null;
  const displayIconUrl = selectedCompany ? getWalletIconUrl(selectedCompany) : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (company) => {
    setWalletCompanyId(String(company.id));
    setDropdownOpen(false);
  };

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
              <div className="jw-brandSelectWrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="jw-brandSelectTrigger jw-select"
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-label={displayName ? `Company: ${displayName}` : "Select Company"}
                >
                  <span className="jw-brandSelectTriggerInner">
                    {displayName ? (
                      <>
                        <span className="jw-brandSelectIconWrap">
                          {displayIconUrl ? (
                            <img src={displayIconUrl} alt="" className="jw-brandSelectIcon" width={50} height={50} />
                          ) : (
                            <span className="jw-brandSelectIconPlaceholder" />
                          )}
                        </span>
                        <span className="jw-brandSelectName">{displayName}</span>
                      </>
                    ) : (
                      <span className="jw-brandSelectPlaceholder">Select Company</span>
                    )}
                  </span>
                  <ChevronDown className="jw-selectIcon jw-brandSelectChevron" size={20} />
                </button>
                {dropdownOpen && (
                  <div className="jw-brandSelectList" role="listbox">
                    {companies.map((c) => {
                      const iconUrl = getWalletIconUrl(c);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="option"
                          aria-selected={String(walletCompanyId) === String(c.id)}
                          className="jw-brandSelectOption"
                          onClick={() => handleSelect(c)}
                        >
                          <span className="jw-brandSelectIconWrap">
                            {iconUrl ? (
                              <img src={iconUrl} alt="" className="jw-brandSelectIcon" width={50} height={50} />
                            ) : (
                              <span className="jw-brandSelectIconPlaceholder" />
                            )}
                          </span>
                          <span className="jw-brandSelectName">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
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

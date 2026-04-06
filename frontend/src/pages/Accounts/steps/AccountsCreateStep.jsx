import React, { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function AccountsCreateStep({
  brand,
  setBrand,
  suggestedUsername,
  onUsernameChange,
  errors,
  onCancel,
  onSubmit,
  brandsAvailable,
  clearBrandError,
  /** When false, username row is hidden (no active Master for selected brand). */
  showUsernameField = true,
  /** Affiliate-only brand: Submit opens partner link; username hidden. */
  affiliateRedirectOnly = false,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedBrand = brandsAvailable.find((b) => (typeof b === "string" ? b : b.name) === brand) ?? null;
  const displayName = typeof selectedBrand === "string" ? selectedBrand : selectedBrand?.name;
  const displayIconSrc = typeof selectedBrand === "object" && selectedBrand?.iconSrc ? selectedBrand.iconSrc : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const name = typeof item === "string" ? item : item.name;
    setBrand(name);
    clearBrandError();
    setDropdownOpen(false);
  };

  return (
    <div className="jw-accountsFormOuter">
      <div className="jw-accountsFormPanel">
        <div className="jw-accountsFormIntro">
          Input details below to Create your new Account
        </div>

        <form className="jw-accountsForm" onSubmit={onSubmit}>
          {/* ✅ TOP: Fields */}
          <div className="jw-accountsFormFields">
            {/* Brand select: 60px height, 50x50 icon + name */}
            <div className="jw-field">
              <div className="jw-brandSelectWrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="jw-brandSelectTrigger jw-select"
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-label={displayName ? `Brand: ${displayName}` : "Select Brand"}
                >
                  <span className="jw-brandSelectTriggerInner">
                    {displayName ? (
                      <>
                        <span className="jw-brandSelectIconWrap">
                          {displayIconSrc ? (
                            <img src={displayIconSrc} alt="" className="jw-brandSelectIcon" width={50} height={50} />
                          ) : (
                            <span className="jw-brandSelectIconPlaceholder" />
                          )}
                        </span>
                        <span className="jw-brandSelectName">{displayName}</span>
                      </>
                    ) : (
                      <span className="jw-brandSelectPlaceholder">Select Brand</span>
                    )}
                  </span>
                  <ChevronDown className="jw-selectIcon jw-brandSelectChevron" size={20} />
                </button>
                {dropdownOpen && (
                  <div className="jw-brandSelectList" role="listbox">
                    {brandsAvailable.map((b) => {
                      const name = typeof b === "string" ? b : b.name;
                      const iconSrc = typeof b === "object" && b.iconSrc ? b.iconSrc : null;
                      return (
                        <button
                          key={typeof b === "object" ? b.id ?? name : name}
                          type="button"
                          role="option"
                          aria-selected={brand === name}
                          className="jw-brandSelectOption"
                          onClick={() => handleSelect(b)}
                        >
                          <span className="jw-brandSelectIconWrap">
                            {iconSrc ? (
                              <img src={iconSrc} alt="" className="jw-brandSelectIcon" width={50} height={50} />
                            ) : (
                              <span className="jw-brandSelectIconPlaceholder" />
                            )}
                          </span>
                          <span className="jw-brandSelectName">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {errors.brand && (
                <div className="jw-fieldError" role="alert">
                  {errors.brand}
                </div>
              )}
              {affiliateRedirectOnly ? (
                <div className="jw-fieldHint jw-fieldHint--affiliateRedirect" role="note">
                  Submit opens the registration page in a new tab.
                </div>
              ) : null}
            </div>

            {/* Username — only when brand has at least one active Master brand_company */}
            {showUsernameField ? (
              <div className="jw-fieldUsername">
                <input
                  className="jw-input"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="Suggest Username (Optional)"
                  value={suggestedUsername}
                  onChange={onUsernameChange}
                />
                <div className="jw-fieldHint">
                  Only small letters and numbers (a-z, 0-9)
                </div>
                {errors.username && (
                  <div className="jw-fieldError" role="alert">
                    {errors.username}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ✅ BOTTOM: Buttons row (stays inside panel) */}
          <div className="jw-accountsFormActions">
            <button
              type="button"
              className="jw-btn jw-btnCancel"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button type="submit" className="jw-btn jw-btnSubmit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
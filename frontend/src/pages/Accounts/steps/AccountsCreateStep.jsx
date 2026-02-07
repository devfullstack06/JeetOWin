import React from "react";
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
}) {
  return (
    <div className="jw-accountsFormOuter">
      <div className="jw-accountsFormPanel">
        <div className="jw-accountsFormIntro">
          Input details below to Create your new Account
        </div>

        <form className="jw-accountsForm" onSubmit={onSubmit}>
          {/* ✅ TOP: Fields */}
          <div className="jw-accountsFormFields">
            {/* Brand select */}
            <div className="jw-field">
              <div className="jw-selectWrap">
                <select
                  className="jw-select"
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    clearBrandError();
                  }}
                >
                  <option value="" disabled>
                    Select Brand
                  </option>
                  {brandsAvailable.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown className="jw-selectIcon" size={20} />
              </div>

              {errors.brand && (
                <div className="jw-fieldError" role="alert">
                  {errors.brand}
                </div>
              )}
            </div>

            {/* Username */}
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
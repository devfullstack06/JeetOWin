import React, { useMemo, useState } from "react";
import { User, ChevronDown } from "lucide-react"; // same icon as LeftNav (keep)
import { useNavigate } from "react-router-dom";
import "./accountsBody.css";

export default function AccountsBody() {
  const navigate = useNavigate();

  // Step control:
  // "list" -> Step 1 (Create New button / list)
  // "create" -> Step 2 (Account Creation Form)
  // "waiting" -> Step 3 placeholder (Ticket created / waiting screen)
  const [step, setStep] = useState("list");

  // Placeholder accounts (later from backend)
  const [accounts] = useState([]); // empty = Step 1
  const hasAccounts = accounts.length > 0;

  // Brands placeholder (later from admin/back-end)
  const brandsAvailable = useMemo(
    () => ["Betpro", "BrandX", "BrandY", "BrandZ"],
    []
  );

  // Form state
  const [brand, setBrand] = useState("");
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setBrand("");
    setSuggestedUsername("");
    setErrors({});
  };

  const goToList = () => {
    setStep("list");
    resetForm();
  };

  const handleClose = () => {
    if (step === "list") {
      navigate("/home");
      return;
    }
    // If user is inside form/waiting, return to list screen
    goToList();
  };

  const handleCreateNew = () => {
    setStep("create");
    setErrors({});
  };

  const handleUsernameChange = (e) => {
    // Only allow lowercase alphanumeric (a-z, 0-9)
    const raw = e.target.value || "";
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    setSuggestedUsername(cleaned);

    // Live clear username error if becomes valid
    setErrors((prev) => {
      const next = { ...prev };
      if (next.username) delete next.username;
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!brand) nextErrors.brand = "Please select a brand.";

    if (suggestedUsername && !/^[a-z0-9]+$/.test(suggestedUsername)) {
      // (Mostly impossible due to sanitization, but keep safe)
      nextErrors.username = "Only lowercase letters and numbers are allowed.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // ✅ Step 3 should appear immediately after validation passes
    // Later: call backend to create ticket
    setStep("waiting");
  };

  return (
    <section className="jw-accountsPage" aria-label="My Accounts">
      <div className="jw-accountsCard">
        {/* ================= HEADER ================= */}
        <div className="jw-accountsHeader">
          <div className="jw-accountsHeaderLeft">
            <span className="jw-accountsIcon" aria-hidden="true">
              <User size={24} />
            </span>
            <h2 className="jw-accountsTitle">My Accounts</h2>
          </div>

          <button
            type="button"
            className="jw-accountsClose"
            aria-label="Close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* ================= SECTION LABEL (line both sides) ================= */}
        <div className="jw-accountsSectionLabel" aria-hidden="true">
          <span className="jw-accountsLine" />
          <span className="jw-accountsLabelText">
            {step === "list" && "My Accounts"}
            {step === "create" && "Create New Account"}
            {step === "waiting" && "Ticket Created"}
          </span>
          <span className="jw-accountsLine" />
        </div>

        {/* ================= STEP 1: CREATE NEW + LIST ================= */}
        {step === "list" && (
          <>
            <div className="jw-accountsCreateNewWrap">
              <button
                type="button"
                className="jw-accountsCreateNew"
                onClick={handleCreateNew}
              >
                <span>Create New</span>
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <path
                    d="M15 6.25V23.75M6.25 15H23.75"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {hasAccounts && (
              <div className="jw-accountsList">
                <div className="jw-accountsListHeader">
                  <span>Username</span>
                  <span>Created</span>
                  <span>Brand</span>
                  <span>Password</span>
                </div>

                {accounts.map((acc, idx) => (
                  <div key={idx} className="jw-accountsRow">
                    <span>{acc.username}</span>
                    <span>{acc.created}</span>
                    <span className="jw-accountsBrand">{acc.brand}</span>
                    <button className="jw-accountsUpdate" type="button">
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= STEP 2: ACCOUNT CREATION FORM ================= */}
        {step === "create" && (
          <div className="jw-accountsFormOuter">
            <div className="jw-accountsFormPanel">
              <div className="jw-accountsFormIntro">
                Input details below to Create your new Account
              </div>

              <form className="jw-accountsForm" onSubmit={handleSubmit}>
                {/* Brand select */}
                <div className="jw-field">
                  <div className="jw-selectWrap">
                    <select
                      className="jw-select"
                      value={brand}
                      onChange={(e) => {
                        setBrand(e.target.value);
                        setErrors((prev) => {
                          const next = { ...prev };
                          if (next.brand) delete next.brand;
                          return next;
                        });
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
                    onChange={handleUsernameChange}
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

                {/* Buttons row */}
                <div className="jw-accountsFormActions">
                  <button
                    type="button"
                    className="jw-btn jw-btnCancel"
                    onClick={goToList}
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
        )}

        {/* ================= STEP 3: WAITING PLACEHOLDER ================= */}
        {step === "waiting" && (
          <div className="jw-waitingOuter">
            <div className="jw-waitingPanel">
              <div className="jw-waitingTitle">Ticket created ✅</div>
              <div className="jw-waitingText">
                Your request has been sent to our admin team. We’ll update your
                ticket with the username & password soon.
              </div>

              <button
                type="button"
                className="jw-btn jw-btnCancel"
                onClick={goToList}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

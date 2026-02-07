import React, { useEffect, useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./accountsBody.css";

import AccountsListStep from "./steps/AccountsListStep";
import AccountsCreateStep from "./steps/AccountsCreateStep";
import AccountsProcessingStep from "./steps/AccountsProcessingStep";
import AccountsCreatedStep from "./steps/AccountsCreatedStep";
import AccountsRejectedStep from "./steps/AccountsRejectedStep";
import usePageTitle from "../../hooks/usePageTitle";


import {
  createAccountTicket,
  fetchBrands,
  fetchMyAccounts,
  fetchTicketStatus,
} from "./api/accountsApi";

export default function AccountsBody() {
  const navigate = useNavigate();

  usePageTitle("Accounts");


  // 5-step flow
  const [step, setStep] = useState("list"); // list | create | processing | created | rejected

  // Data
  const [accounts, setAccounts] = useState([]);
  const [brands, setBrands] = useState([]);
  const brandsAvailable = useMemo(() => brands, [brands]);

  // Form state
  const [brand, setBrand] = useState("");
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const [errors, setErrors] = useState({});

  // Ticket + result states
  const [ticketId, setTicketId] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [rejectedReason, setRejectedReason] = useState("");

  const pollingRef = useRef(null);

  const resetForm = () => {
    setBrand("");
    setSuggestedUsername("");
    setErrors({});
  };

  const goToList = async () => {
    setStep("list");
    setTicketId(null);
    setCreatedAccount(null);
    setRejectedReason("");
    resetForm();

    // Refresh list after any flow
    try {
      const data = await fetchMyAccounts();
      setAccounts(data?.accounts ?? []);
    } catch (e) {
      // keep silent to avoid breaking UX; console is enough
      console.error("[Accounts] refresh accounts failed:", e);
    }
  };

  const handleClose = () => {
    if (step === "list") {
      navigate("/home");
      return;
    }
    goToList();
  };

  const handleCreateNew = () => {
    setStep("create");
    setErrors({});
  };

  const handleUsernameChange = (e) => {
    const raw = e.target.value || "";
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    setSuggestedUsername(cleaned);

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
      nextErrors.username = "Only lowercase letters and numbers are allowed.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearBrandError = () => {
    setErrors((prev) => {
      const next = { ...prev };
      if (next.brand) delete next.brand;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Step 3 immediately after validation passes
    setStep("processing");

    try {
      const res = await createAccountTicket({
        brand,
        suggestedUsername: suggestedUsername || null,
      });

      const newTicketId = res?.ticketId;
      setTicketId(newTicketId || null);

      // Start polling (admin not ready => likely remains pending)
      // If backend instantly returns approved/rejected, we'll handle it too.
    } catch (err) {
      console.error("[Accounts] create ticket failed:", err);
      // Put user back to create with a readable error
      setStep("create");
      setErrors((prev) => ({
        ...prev,
        submit: err?.message || "Failed to submit request.",
      }));
    }
  };

  // Initial load: brands + accounts
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [brandsRes, accountsRes] = await Promise.allSettled([
          fetchBrands(),
          fetchMyAccounts(),
        ]);

        if (cancelled) return;

        if (brandsRes.status === "fulfilled") {
          setBrands(brandsRes.value?.brands ?? []);
        } else {
          console.error("[Accounts] fetch brands failed:", brandsRes.reason);
          setBrands([]); // fallback
        }

        if (accountsRes.status === "fulfilled") {
          setAccounts(accountsRes.value?.accounts ?? []);
        } else {
          console.error("[Accounts] fetch accounts failed:", accountsRes.reason);
          setAccounts([]);
        }
      } catch (e) {
        console.error("[Accounts] load failed:", e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll ticket status while in processing
  useEffect(() => {
    // Clear any previous polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (step !== "processing" || !ticketId) return;

    const poll = async () => {
      try {
        const data = await fetchTicketStatus(ticketId);

        const status = data?.status; // pending | approved | rejected
        if (!status || status === "pending") return;

        if (status === "approved") {
          setCreatedAccount(data?.account ?? null);
          setStep("created");
          return;
        }

        if (status === "rejected") {
          setRejectedReason(data?.reason || "");
          setStep("rejected");
          return;
        }
      } catch (e) {
        console.error("[Accounts] poll status failed:", e);
        // keep trying; transient errors shouldn't break UX
      }
    };

    // Poll immediately then every 4s
    poll();
    pollingRef.current = setInterval(poll, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [step, ticketId]);

  const sectionLabel = useMemo(() => {
    if (step === "list") return "My Accounts";
    if (step === "create") return "Create New Account";
    if (step === "processing") return "Ticket Created";
    if (step === "created") return "Account Created";
    if (step === "rejected") return "Rejected";
    return "My Accounts";
  }, [step]);

  return (
    <section className="jw-accountsPage" aria-label="My Accounts">
      <div className="jw-accountsCard">
        {/* HEADER */}
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

        {/* SECTION LABEL */}
        <div className="jw-accountsSectionLabel" aria-hidden="true">
          <span className="jw-accountsLine" />
          <span className="jw-accountsLabelText">{sectionLabel}</span>
          <span className="jw-accountsLine" />
        </div>

        {/* Global submit error (optional) */}
        {errors.submit && step === "create" && (
          <div className="jw-submitError" role="alert">
            {errors.submit}
          </div>
        )}

        {/* STEP RENDER */}
        {step === "list" && (
          <AccountsListStep
            accounts={accounts}
            onCreateNew={handleCreateNew}
          />
        )}

        {step === "create" && (
          <AccountsCreateStep
            brand={brand}
            setBrand={setBrand}
            suggestedUsername={suggestedUsername}
            onUsernameChange={handleUsernameChange}
            errors={errors}
            onCancel={goToList}
            onSubmit={handleSubmit}
            brandsAvailable={brandsAvailable}
            clearBrandError={clearBrandError}
          />
        )}

        {step === "processing" && (
          <AccountsProcessingStep ticketId={ticketId} onBack={goToList} />
        )}

        {step === "created" && (
          <AccountsCreatedStep createdAccount={createdAccount} onGoToList={goToList} />
        )}

        {step === "rejected" && (
          <AccountsRejectedStep reason={rejectedReason} onGoToList={goToList} />
        )}
      </div>
    </section>
  );
}
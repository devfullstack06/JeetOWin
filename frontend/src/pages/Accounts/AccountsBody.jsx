import React, { useEffect, useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../Wallets/walletsBody.css";
import "./accountsBody.css";

import AccountsListStep from "./steps/AccountsListStep";
import AccountsCreateStep from "./steps/AccountsCreateStep";
import AccountsProcessingStep from "./steps/AccountsProcessingStep";
import AccountsCreatedStep from "./steps/AccountsCreatedStep";
import AccountsRejectedStep from "./steps/AccountsRejectedStep";
import usePageTitle from "../../hooks/usePageTitle";


import { getApiOrigin } from "../../utils/walletIconUrl";
import {
  createAccountTicket,
  fetchBrands,
  fetchMyAccounts,
  fetchPendingAccountTickets,
} from "./api/accountsApi";

function mapAccountsBrandsFromApi(raw) {
  const origin = getApiOrigin();
  return (raw || []).map((b) => {
    if (typeof b === "string") {
      return { id: b, name: b, iconPath: null, iconSrc: "" };
    }
    const iconSrc = b.iconPath
      ? `${origin}${b.iconPath.startsWith("/") ? b.iconPath : `/${b.iconPath}`}`
      : "";
    return { ...b, iconSrc };
  });
}

export default function AccountsBody() {
  const navigate = useNavigate();

  usePageTitle("Accounts");


  // 5-step flow
  const [step, setStep] = useState("list"); // list | create | processing | created | rejected

  // Data
  const [accounts, setAccounts] = useState([]);
  const [brands, setBrands] = useState([]);
  const brandsAvailable = useMemo(() => brands, [brands]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [pendingTicketsList, setPendingTicketsList] = useState([]);

  const normalizedBrands = useMemo(() => {
    return (brands || []).map((b) => ({
      id: b.id,
      name: b.name != null ? String(b.name) : "",
      iconPath: b.iconPath ?? b.icon_path ?? null,
      sortOrder: b.sortOrder ?? b.sort_order ?? 0,
    }));
  }, [brands]);

  /** Brand names the API exposes for Accounts (available_accounts). Only these rows/tiles apply. */
  const allowedAccountBrandNames = useMemo(() => {
    const s = new Set();
    for (const b of normalizedBrands) {
      const n = b.name != null ? String(b.name).trim() : "";
      if (n) s.add(n);
    }
    return s;
  }, [normalizedBrands]);

  const accountsEligibleForList = useMemo(() => {
    if (allowedAccountBrandNames.size === 0) return [];
    return accounts.filter((a) => {
      const bn = a.brand != null ? String(a.brand).trim() : "";
      return bn && allowedAccountBrandNames.has(bn);
    });
  }, [accounts, allowedAccountBrandNames]);

  const filteredAccounts = useMemo(() => {
    if (selectedBrandId == null) return accountsEligibleForList;
    const brandName = normalizedBrands.find((x) => x.id === selectedBrandId)?.name;
    if (!brandName) return accountsEligibleForList;
    const key = String(brandName).trim();
    return accountsEligibleForList.filter((a) => String(a.brand).trim() === key);
  }, [accountsEligibleForList, selectedBrandId, normalizedBrands]);

  const pendingTicketsEligible = useMemo(() => {
    if (allowedAccountBrandNames.size === 0) return [];
    return pendingTicketsList.filter((t) => {
      const bn = t.brand != null ? String(t.brand).trim() : "";
      return bn && allowedAccountBrandNames.has(bn);
    });
  }, [pendingTicketsList, allowedAccountBrandNames]);

  const filteredPendingTickets = useMemo(() => {
    if (selectedBrandId == null) return pendingTicketsEligible;
    const brandName = normalizedBrands.find((x) => x.id === selectedBrandId)?.name;
    if (!brandName) return pendingTicketsEligible;
    const key = String(brandName).trim();
    return pendingTicketsEligible.filter((t) => String(t.brand).trim() === key);
  }, [pendingTicketsEligible, selectedBrandId, normalizedBrands]);

  const accountsTableRows = useMemo(() => {
    const accountRows = filteredAccounts.map((a) => ({
      rowKind: "account",
      rowKey: `account-${a.id}`,
      account: a,
    }));
    const ticketRows = filteredPendingTickets.map((t) => ({
      rowKind: "pendingTicket",
      rowKey: `ticket-${t.id}`,
      ticket: t,
    }));
    const merged = [...ticketRows, ...accountRows];
    merged.sort((x, y) => {
      const ax = x.rowKind === "account" ? x.account?.createdAt : x.ticket?.createdAt;
      const by = y.rowKind === "account" ? y.account?.createdAt : y.ticket?.createdAt;
      const ta = ax ? new Date(ax).getTime() : 0;
      const tb = by ? new Date(by).getTime() : 0;
      return tb - ta;
    });
    return merged;
  }, [filteredAccounts, filteredPendingTickets]);

  const pendingTicketsCount = filteredPendingTickets.length;

  useEffect(() => {
    if (selectedBrandId == null) return;
    const stillValid = normalizedBrands.some((b) => b.id === selectedBrandId);
    if (!stillValid) setSelectedBrandId(null);
  }, [normalizedBrands, selectedBrandId]);

  // Form state
  const [brand, setBrand] = useState("");
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const [errors, setErrors] = useState({});

  // Ticket + result states
  const [ticketId, setTicketId] = useState(null);
  const [processingTicket, setProcessingTicket] = useState(null); // { ticketId, createdAt, brand, username, status } after create
  const [createdAccount, setCreatedAccount] = useState(null);
  const [rejectedReason, setRejectedReason] = useState("");

  const pollingRef = useRef(null);

  const loadBrands = async () => {
    const res = await fetchBrands();
    const mapped = mapAccountsBrandsFromApi(res?.brands ?? []);
    setBrands(mapped);
    return mapped;
  };

  const resetForm = () => {
    setBrand("");
    setSuggestedUsername("");
    setErrors({});
  };

  const goToList = async () => {
    setStep("list");
    setTicketId(null);
    setProcessingTicket(null);
    setCreatedAccount(null);
    setRejectedReason("");
    resetForm();

    try {
      const [accRes, ticRes] = await Promise.allSettled([
        fetchMyAccounts(),
        fetchPendingAccountTickets(),
      ]);
      if (accRes.status === "fulfilled") setAccounts(accRes.value?.accounts ?? []);
      if (ticRes.status === "fulfilled") setPendingTicketsList(ticRes.value?.tickets ?? []);
    } catch (e) {
      console.error("[Accounts] refresh list failed:", e);
    }
  };

  const handleClose = () => {
    if (step === "list") {
      navigate("/home");
      return;
    }
    goToList();
  };

  const handleCreateNew = async () => {
    let rows = brands;
    if (!rows.length) {
      try {
        rows = await loadBrands();
      } catch {
        /* brands may still load from initial effect */
      }
    }
    if (selectedBrandId != null) {
      const row = rows.find((b) => String(b.id) === String(selectedBrandId));
      setBrand(row?.name != null ? String(row.name) : "");
    } else {
      setBrand("");
    }
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
      setProcessingTicket(
        newTicketId
          ? {
              ticketId: newTicketId,
              createdAt: res?.createdAt ?? null,
              brand: res?.brand ?? brand,
              username: res?.username ?? suggestedUsername ?? null,
              status: res?.status ?? "pending",
            }
          : null
      );

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

  // Initial load: brands + accounts + pending tickets
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [brandsRes, accountsRes, ticketsRes] = await Promise.allSettled([
          fetchBrands(),
          fetchMyAccounts(),
          fetchPendingAccountTickets(),
        ]);

        if (cancelled) return;

        if (brandsRes.status === "fulfilled") {
          setBrands(mapAccountsBrandsFromApi(brandsRes.value?.brands ?? []));
        } else {
          console.error("[Accounts] fetch brands failed:", brandsRes.reason);
          setBrands([]);
        }

        if (accountsRes.status === "fulfilled") {
          setAccounts(accountsRes.value?.accounts ?? []);
        } else {
          console.error("[Accounts] fetch accounts failed:", accountsRes.reason);
          setAccounts([]);
        }

        if (ticketsRes.status === "fulfilled") {
          setPendingTicketsList(ticketsRes.value?.tickets ?? []);
        } else {
          console.error("[Accounts] fetch pending tickets failed:", ticketsRes.reason);
          setPendingTicketsList([]);
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
        const res = await fetch(`/api/accounts/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        if (res.status === 404) {
          setCreatedAccount(null);
          setStep("created");
          return;
        }
        const data = await res.json().catch(() => ({}));
        const status = data?.status;
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
            brands={normalizedBrands}
            accountsTableRows={accountsTableRows}
            selectedBrandId={selectedBrandId}
            onSelectBrand={setSelectedBrandId}
            onCreateNew={handleCreateNew}
            pendingTicketsCount={pendingTicketsCount}
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
          <AccountsProcessingStep ticket={processingTicket} onBack={goToList} />
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import TransactionsIcon from "../../assets/bottomnav/Transactions.svg";
import { useLocation, useNavigate } from "react-router-dom";
import usePageTitle from "../../hooks/usePageTitle";

import "./transactionsBody.css";

import SlipModal from "./components/SlipModal";

import DepositDetailsStep from "./steps/deposit/DepositDetailsStep";
import DepositTicketStep from "./steps/deposit/DepositTicketStep";
import WithdrawDetailsStep from "./steps/withdraw/WithdrawDetailsStep";
import WithdrawTicketStep from "./steps/withdraw/WithdrawTicketStep";

import {
  paymentCompanies,
  paymentWallets,
} from "./config/transactionsMockData";
import {
  createDepositTicket,
  createWithdrawTicket,
  fetchTransactionTicket,
  devSetTicketStatus,
} from "./api/transactionsApi";

// reuse existing Wallets APIs
import {
  fetchWalletCompanies,
  fetchMyWallets,
} from "../Wallets/api/walletsApi";

export default function TransactionsBody({ initialTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle("Transactions");

  // dev helper (optional)
  useEffect(() => {
    window.jwDevSetTicketStatus = devSetTicketStatus;
  }, []);

  const tabFromPath = useMemo(() => {
    if (location.pathname === "/withdraw") return "withdraw";
    if (location.pathname === "/deposit") return "deposit";
    return null;
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(
    initialTab || tabFromPath || "deposit",
  );

  // =======================
  // Deposit State
  // =======================
  const activeDepositCompanies = useMemo(() => {
    return [...paymentCompanies]
      .filter((c) => c.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, []);

  const defaultDepositCompanyId = useMemo(() => {
    return activeDepositCompanies[0]?.id || null;
  }, [activeDepositCompanies]);

  const [depStep, setDepStep] = useState("details"); // details | process | approved | rejected
  const [depCompanyId, setDepCompanyId] = useState(defaultDepositCompanyId);
  const [depWalletId, setDepWalletId] = useState(null); // random wallet per company per visit

  const [depAmount, setDepAmount] = useState("");
  const [depSlipFile, setDepSlipFile] = useState(null);
  const [depSlipUrl, setDepSlipUrl] = useState(null);

  const [depTicketId, setDepTicketId] = useState(null);
  const [depTicket, setDepTicket] = useState(null);
  const [depErrors, setDepErrors] = useState({});

  const depActiveWallet = useMemo(() => {
    if (!depWalletId) return null;
    return paymentWallets.find((w) => w.id === depWalletId) || null;
  }, [depWalletId]);

  // random wallet pick per company
  useEffect(() => {
    if (!depCompanyId) return;

    const pool = paymentWallets.filter(
      (w) => w.paymentCompanyId === depCompanyId,
    );
    if (!pool.length) {
      setDepWalletId(null);
      return;
    }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setDepWalletId(picked.id);
  }, [depCompanyId]);

  const clearDepositForm = () => {
    setDepAmount("");
    setDepSlipFile(null);
    if (depSlipUrl) URL.revokeObjectURL(depSlipUrl);
    setDepSlipUrl(null);
    setDepErrors({});
  };

  const onPickDepositSlip = (file) => {
    setDepErrors((p) => ({ ...p, slip: undefined }));
    setDepSlipFile(file || null);

    if (depSlipUrl) URL.revokeObjectURL(depSlipUrl);
    if (!file) {
      setDepSlipUrl(null);
      return;
    }
    setDepSlipUrl(URL.createObjectURL(file));
  };

  // =======================
  // Withdraw State
  // =======================
  const [wdStep, setWdStep] = useState("details");
  const [walletCompanies, setWalletCompanies] = useState([]);
  const [wdCompanyId, setWdCompanyId] = useState(null);
  const [wdWallets, setWdWallets] = useState([]);
  const [wdSelectedWalletId, setWdSelectedWalletId] = useState(null);

  const [wdAmount, setWdAmount] = useState("");
  const [wdTicketId, setWdTicketId] = useState(null);
  const [wdTicket, setWdTicket] = useState(null);
  const [wdErrors, setWdErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cRes = await fetchWalletCompanies();
        if (cancelled) return;

        const comps = (cRes?.companies ?? [])
          .map((x) => ({
            id: x.id,
            name: x.name,
            iconKey: x.icon_key || x.iconKey,
            sortOrder: x.sort_order ?? x.sortOrder ?? 0,
            isActive: x.is_active ?? x.isActive ?? 1,
          }))
          .filter((x) => x.isActive);

        comps.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        setWalletCompanies(comps);
        setWdCompanyId((prev) => prev ?? comps[0]?.id ?? null);

        const wRes = await fetchMyWallets(null);
        if (cancelled) return;

        setWdWallets(wRes?.wallets ?? []);
      } catch (e) {
        console.error("[Transactions] withdraw initial load failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const wdFilteredWallets = useMemo(() => {
    if (!wdCompanyId) return [];
    return (wdWallets || []).filter(
      (w) =>
        Number(w.wallet_company_id || w.walletCompanyId) ===
        Number(wdCompanyId),
    );
  }, [wdWallets, wdCompanyId]);

  const wdMinAmount = 500; // later admin config per wallet company
  const wdQuickAmounts = [500, 1000, 5000, 10000]; // later admin config per wallet company

  const clearWithdrawForm = () => {
    setWdAmount("");
    setWdSelectedWalletId(null);
    setWdErrors({});
  };

  // =======================
  // Tab change + URL sync
  // =======================
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "deposit" && location.pathname !== "/deposit")
      navigate("/deposit");
    if (tab === "withdraw" && location.pathname !== "/withdraw")
      navigate("/withdraw");
  };

  // current step (for X behavior)
  const currentStep = activeTab === "deposit" ? depStep : wdStep;

  // ✅ X behavior rule:
  // - on details => /home
  // - on ticket steps => back to details
  const handleCloseX = () => {
    if (currentStep === "details") {
      navigate("/home");
      return;
    }

    if (activeTab === "deposit") {
      setDepStep("details");
      clearDepositForm();
      setDepTicket(null);
      setDepTicketId(null);
    } else {
      setWdStep("details");
      clearWithdrawForm();
      setWdTicket(null);
      setWdTicketId(null);
    }
  };

  // =======================
  // Submit Deposit
  // =======================
  const submitDeposit = async () => {
    const nextErr = {};
    const minAmt = depActiveWallet?.minAmount ?? 500;
    const amtNum = Number(depAmount || "0");

    if (!depCompanyId) nextErr.submit = "Please select a payment method.";
    if (!depAmount || isNaN(amtNum) || amtNum < minAmt) {
      nextErr.amount = `Minimum deposit is Rs. ${Number(minAmt).toLocaleString()}.`;
    }
    if (!depSlipFile) nextErr.slip = "Please attach deposit slip.";

    setDepErrors(nextErr);
    if (Object.keys(nextErr).length) return;

    try {
      const res = await createDepositTicket({
        walletCompanyName:
          activeDepositCompanies.find((c) => c.id === depCompanyId)?.name ||
          "Deposit",
        accountTitle: depActiveWallet?.holderName || "-",
        accountNumber: depActiveWallet?.holderNumber || "-",
        amount: amtNum,
        slipUrl: depSlipUrl,
      });

      setDepTicket(res.ticket);
      setDepTicketId(res.ticket.id);
      setDepStep("process");
      setDepErrors({});
    } catch (e) {
      setDepErrors({
        submit: e?.message || "Failed to create deposit ticket.",
      });
    }
  };

  // =======================
  // Submit Withdraw
  // =======================
  const submitWithdraw = async () => {
    const nextErr = {};
    const amtNum = Number(wdAmount || "0");

    if (!wdCompanyId) nextErr.submit = "Please select wallet company.";
    if (!wdSelectedWalletId) nextErr.wallet = "Please select your wallet.";
    if (!wdAmount || isNaN(amtNum) || amtNum < wdMinAmount) {
      nextErr.amount = `Minimum withdraw is Rs. ${Number(wdMinAmount).toLocaleString()}.`;
    }

    setWdErrors(nextErr);
    if (Object.keys(nextErr).length) return;

    const selectedWallet = wdFilteredWallets.find(
      (w) => w.id === wdSelectedWalletId,
    );
    if (!selectedWallet) {
      setWdErrors({ wallet: "Selected wallet not found." });
      return;
    }

    const companyName =
      walletCompanies.find((c) => c.id === wdCompanyId)?.name || "Withdraw";

    try {
      const res = await createWithdrawTicket({
        walletCompanyName: companyName,
        accountTitle:
          selectedWallet.account_title || selectedWallet.accountTitle || "-",
        accountNumber:
          selectedWallet.account_number || selectedWallet.accountNumber || "-",
        amount: amtNum,
      });

      setWdTicket(res.ticket);
      setWdTicketId(res.ticket.id);
      setWdStep("process");
      setWdErrors({});
    } catch (e) {
      setWdErrors({
        submit: e?.message || "Failed to create withdraw ticket.",
      });
    }
  };

  // =======================
  // Polling
  // =======================
  const pollRef = useRef(null);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const isDepPolling =
      activeTab === "deposit" && depStep === "process" && depTicketId;
    const isWdPolling =
      activeTab === "withdraw" && wdStep === "process" && wdTicketId;

    const ticketId = isDepPolling
      ? depTicketId
      : isWdPolling
        ? wdTicketId
        : null;
    if (!ticketId) return;

    const tick = async () => {
      try {
        const res = await fetchTransactionTicket(ticketId);
        const t = res?.ticket;

        if (isDepPolling) {
          setDepTicket(t);
          if (t?.status === "APPROVED") setDepStep("approved");
          if (t?.status === "REJECTED") setDepStep("rejected");
        } else if (isWdPolling) {
          setWdTicket(t);
          if (t?.status === "APPROVED") setWdStep("approved");
          if (t?.status === "REJECTED") setWdStep("rejected");
        }
      } catch {
        // silent
      }
    };

    tick();
    pollRef.current = setInterval(tick, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [activeTab, depStep, depTicketId, wdStep, wdTicketId]);

  // =======================
  // Slip modal
  // =======================
  const [slipOpen, setSlipOpen] = useState(false);

  // Ticket label text shown on ticket steps only
  const ticketLabelText = useMemo(() => {
    if (activeTab === "deposit") {
      if (depStep === "process") return "Processing Deposit";
      if (depStep === "approved") return "Deposit Approved";
      if (depStep === "rejected") return "Deposit Rejected";
      return "";
    }
    if (wdStep === "process") return "Processing Withdraw";
    if (wdStep === "approved") return "Withdraw Approved";
    if (wdStep === "rejected") return "Withdraw Rejected";
    return "";
  }, [activeTab, depStep, wdStep]);

  return (
    <section className="jw-transactionsPage" aria-label="Transactions">
      <div className="jw-transactionsCard">
        {/* HEADER */}
        <div className="jw-transactionsHeader">
          <div className="jw-transactionsHeaderLeft">
            <span className="jw-transactionsIcon" aria-hidden="true">
              <img
                src={TransactionsIcon}
                alt=""
                className="jw-transactionsIconImg"
                draggable="false"
              />
            </span>

            <h2 className="jw-transactionsTitle">Transactions</h2>
          </div>

          <button
            type="button"
            className="jw-transactionsClose"
            aria-label="Close"
            onClick={handleCloseX}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="jw-txBodyScroll">
          {/* Deposit */}
          {activeTab === "deposit" && depStep === "details" && (
            <DepositDetailsStep
              activeTab={activeTab}
              onTabChange={handleTabChange}
              companies={activeDepositCompanies}
              selectedCompanyId={depCompanyId}
              onSelectCompany={(id) => {
                setDepCompanyId(id);
                setDepErrors({});
              }}
              activeWallet={depActiveWallet}
              amount={depAmount}
              setAmount={(v) => {
                setDepAmount(v);
                setDepErrors((p) => ({ ...p, amount: undefined }));
              }}
              slipFile={depSlipFile}
              slipPreviewUrl={depSlipUrl}
              onPickSlip={onPickDepositSlip}
              onClear={clearDepositForm}
              onSubmit={submitDeposit}
              errors={depErrors}
            />
          )}

          {activeTab === "deposit" && depStep !== "details" && (
            <DepositTicketStep
              labelText={ticketLabelText}
              step={depStep}
              ticket={depTicket}
              onOpenSlip={() => setSlipOpen(true)}
              onClose={() => {
                setDepStep("details");
                clearDepositForm();
                setDepTicket(null);
                setDepTicketId(null);
              }}
            />
          )}

          {/* Withdraw */}
          {activeTab === "withdraw" && wdStep === "details" && (
            <WithdrawDetailsStep
              activeTab={activeTab}
              onTabChange={handleTabChange}
              walletCompanies={walletCompanies}
              selectedWalletCompanyId={wdCompanyId}
              onSelectWalletCompany={(id) => {
                setWdCompanyId(id);
                setWdSelectedWalletId(null);
                setWdErrors({});
              }}
              clientWallets={wdFilteredWallets}
              selectedClientWalletId={wdSelectedWalletId}
              onSelectClientWallet={(id) => {
                setWdSelectedWalletId(id);
                setWdErrors((p) => ({ ...p, wallet: undefined }));
              }}
              minAmount={wdMinAmount}
              quickAmounts={wdQuickAmounts}
              amount={wdAmount}
              setAmount={(v) => {
                setWdAmount(v);
                setWdErrors((p) => ({ ...p, amount: undefined }));
              }}
              onClear={clearWithdrawForm}
              onSubmit={submitWithdraw}
              errors={wdErrors}
            />
          )}

          {activeTab === "withdraw" && wdStep !== "details" && (
            <WithdrawTicketStep
              labelText={ticketLabelText}
              step={wdStep}
              ticket={wdTicket}
              onClose={() => {
                setWdStep("details");
                clearWithdrawForm();
                setWdTicket(null);
                setWdTicketId(null);
              }}
            />
          )}
        </div>
      </div>

      {/* Slip modal */}
      <SlipModal
        open={slipOpen}
        onClose={() => setSlipOpen(false)}
        slipUrl={depTicket?.slipUrl || depSlipUrl}
      />
    </section>
  );
}

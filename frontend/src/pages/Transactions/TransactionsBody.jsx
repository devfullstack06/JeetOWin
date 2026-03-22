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
  createDepositTicket,
  fetchDepositTicketStatus,
  createWithdrawTicket,
  fetchTransactionTicket,
} from "./api/transactionsApi";
import { apiFetch } from "../../services/api";

// reuse existing Wallets APIs
import {
  fetchWalletCompanies,
  fetchMyWallets,
  fetchPaymentWallets,
} from "../Wallets/api/walletsApi";

export default function TransactionsBody({ initialTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle("Transactions");

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
  const [depositCompanies, setDepositCompanies] = useState([]);
  const activeDepositCompanies = useMemo(() => {
    return [...depositCompanies].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [depositCompanies]);

  const defaultDepositCompanyId = useMemo(
    () => activeDepositCompanies[0]?.id ?? null,
    [activeDepositCompanies]
  );

  const [depStep, setDepStep] = useState("details"); // details | process | approved | rejected
  const [depCompanyId, setDepCompanyId] = useState(null);
  const [depPaymentWallets, setDepPaymentWallets] = useState([]);
  const [depActiveWallet, setDepActiveWallet] = useState(null); // picked payment wallet from API

  const [depAmount, setDepAmount] = useState("");
  const [depSlipFile, setDepSlipFile] = useState(null);
  const [depSlipUrl, setDepSlipUrl] = useState(null);

  const [depTicketId, setDepTicketId] = useState(null);
  const [depTicket, setDepTicket] = useState(null);
  const [depErrors, setDepErrors] = useState({});
  const [depSubmitting, setDepSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cRes = await fetchWalletCompanies("deposit");
        if (cancelled) return;
        const comps = (cRes?.companies ?? []).map((x) => ({
          id: x.id,
          name: x.name,
          iconPath: x.icon_path ?? x.iconPath,
          iconKey: x.icon_key ?? x.iconKey,
          iconSvg: x.iconSvg,
          sortOrder: x.sort_order ?? x.sortOrder ?? 0,
          depositProcessMinutes: x.depositProcessMinutes ?? x.deposit_process_minutes ?? 10,
        }));
        comps.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setDepositCompanies(comps);
        setDepCompanyId((prev) => prev ?? comps[0]?.id ?? null);
      } catch (e) {
        console.error("[Transactions] deposit companies load failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // fetch payment wallets for selected company; pick one at random
  useEffect(() => {
    if (!depCompanyId) {
      setDepPaymentWallets([]);
      setDepActiveWallet(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPaymentWallets(depCompanyId);
        if (cancelled) return;
        const list = res?.paymentWallets ?? [];
        setDepPaymentWallets(list);
        if (!list.length) {
          setDepActiveWallet(null);
          return;
        }
        const picked = list[Math.floor(Math.random() * list.length)];
        setDepActiveWallet({
          id: picked.id,
          holderName: picked.name,
          holderNumber: picked.number,
          minAmount: Number(picked.minDeposit) || 500,
          maxAmount: Number(picked.maxDeposit) || 0,
          qrImagePath: picked.qrImagePath || null,
        });
      } catch (e) {
        if (!cancelled) {
          console.error("[Transactions] payment wallets fetch failed:", e);
          setDepPaymentWallets([]);
          setDepActiveWallet(null);
        }
      }
    })();
    return () => { cancelled = true; };
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
  const [wdSubmitting, setWdSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cRes = await fetchWalletCompanies("withdraw");
        if (cancelled) return;

        const comps = (cRes?.companies ?? []).map((x) => ({
          id: x.id,
          name: x.name,
          iconPath: x.icon_path ?? x.iconPath,
          iconKey: x.icon_key ?? x.iconKey,
          iconSvg: x.iconSvg,
          sortOrder: x.sort_order ?? x.sortOrder ?? 0,
          minWithdraw: x.minWithdraw ?? x.min_withdraw ?? 500,
          withdrawProcessMinutes: x.withdrawProcessMinutes ?? x.withdraw_process_minutes ?? 15,
        }));

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

  const selectedWdCompany = useMemo(
    () => walletCompanies.find((c) => Number(c.id) === Number(wdCompanyId)),
    [walletCompanies, wdCompanyId]
  );
  const wdMinAmount = selectedWdCompany?.minWithdraw ?? 500;
  const wdQuickAmounts = useMemo(
    () => [500, 1000, 5000, 10000].filter((a) => a >= wdMinAmount),
    [wdMinAmount]
  );

  const [wdBalance, setWdBalance] = useState(null);
  useEffect(() => {
    if (activeTab !== "withdraw") return;
    apiFetch("/api/client/dashboard")
      .then((data) => setWdBalance(data?.balance ?? 0))
      .catch(() => setWdBalance(0));
  }, [activeTab, wdStep]);

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
    const maxAmt = depActiveWallet?.maxAmount ?? 0;
    const amtNum = Number(depAmount || "0");

    if (!depCompanyId) nextErr.submit = "Please select a payment method.";
    if (!depAmount || isNaN(amtNum) || amtNum < minAmt) {
      nextErr.amount = `Minimum deposit is Rs. ${Number(minAmt).toLocaleString()}.`;
    }
    if (
      Number.isFinite(amtNum) &&
      maxAmt > 0 &&
      amtNum > maxAmt
    ) {
      nextErr.quickAmount = `Maximum deposit is Rs. ${Number(maxAmt).toLocaleString()}.`;
    }
    if (!depSlipFile) nextErr.slip = "Please attach deposit slip.";

    setDepErrors(nextErr);
    if (Object.keys(nextErr).length) return;

    setDepSubmitting(true);
    try {
      const res = await createDepositTicket({
        walletCompanyId: depCompanyId,
        paymentWalletId: depActiveWallet?.id,
        amount: amtNum,
        slip: depSlipFile || undefined,
      });

      const selectedDepCompany = activeDepositCompanies.find((c) => c.id === depCompanyId);
      const companyName = selectedDepCompany?.name || "Deposit";
      const depProcessMins = selectedDepCompany?.depositProcessMinutes ?? 10;
      setDepTicket({
        id: res.ticketId,
        type: "DEPOSIT",
        status: "PROCESSING",
        depositProcessMinutes: depProcessMins,
        createdAt: res.createdAt,
        createdByUsername: res.createdByUsername ?? null,
        walletCompanyName: companyName,
        accountTitle: depActiveWallet?.holderName || "-",
        accountNumber: depActiveWallet?.holderNumber || "-",
        amount: res.amount ?? amtNum,
        slipUrl: depSlipUrl || (res.slipPath ? `${window.location.origin}${res.slipPath}` : null),
        reason: null,
        approvedAt: null,
        rejectedAt: null,
      });
      setDepTicketId(res.ticketId);
      setDepStep("process");
      setDepErrors({});
    } catch (e) {
      const msg = e?.message || "Failed to create deposit ticket.";
      const isMaxDepositMsg = /maximum\s+deposit/i.test(msg);
      setDepErrors(
        isMaxDepositMsg ? { quickAmount: msg } : { submit: msg },
      );
    } finally {
      setDepSubmitting(false);
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

    setWdSubmitting(true);
    const selectedWallet = wdFilteredWallets.find(
      (w) => w.id === wdSelectedWalletId,
    );
    if (!selectedWallet) {
      setWdErrors({ wallet: "Selected wallet not found." });
      setWdSubmitting(false);
      return;
    }

    try {
      const res = await createWithdrawTicket({
        clientWalletId: wdSelectedWalletId,
        amount: amtNum,
      });

      setWdTicket(res.ticket);
      setWdTicketId(res.ticket.id);
      setWdStep("process");
      setWdErrors({});
      window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
    } catch (e) {
      setWdErrors({
        submit: e?.message || "Failed to create withdraw ticket.",
      });
    } finally {
      setWdSubmitting(false);
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
        if (isDepPolling) {
          const res = await fetchDepositTicketStatus(ticketId);
          if (res == null) return; // 404
          setDepTicket((prev) => ({
            ...prev,
            id: res.ticketId,
            status: res.status === "approved" ? "APPROVED" : res.status === "rejected" ? "REJECTED" : "PROCESSING",
            createdAt: res.createdAt,
            updatedAt: res.updatedAt,
            approvedAt: res.status === "approved" ? res.updatedAt : null,
            rejectedAt: res.status === "rejected" ? res.updatedAt : null,
            reason: res.reason || null,
            createdByUsername: res.createdByUsername ?? prev?.createdByUsername ?? null,
            depositProcessMinutes: res.depositProcessMinutes ?? prev?.depositProcessMinutes ?? 10,
          }));
          if (res.status === "approved") {
            setDepStep("approved");
            window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
          }
          if (res.status === "rejected") setDepStep("rejected");
        } else if (isWdPolling) {
          const res = await fetchTransactionTicket(ticketId);
          if (res == null) return; // 404
          const t = res.ticket;
          setWdTicket(t);
          if (t?.status === "APPROVED") {
            setWdStep("approved");
            window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
          }
          if (t?.status === "REJECTED") {
            setWdStep("rejected");
            window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
          }
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
                setDepErrors((p) => ({
                  ...p,
                  amount: undefined,
                  quickAmount: undefined,
                }));
              }}
              slipFile={depSlipFile}
              slipPreviewUrl={depSlipUrl}
              onPickSlip={onPickDepositSlip}
              onClear={clearDepositForm}
              onSubmit={submitDeposit}
              submitting={depSubmitting}
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
              availableBalance={wdBalance}
              amount={wdAmount}
              setAmount={(v) => {
                setWdAmount(v);
                setWdErrors((p) => ({ ...p, amount: undefined }));
              }}
              onClear={clearWithdrawForm}
              onSubmit={submitWithdraw}
              submitting={wdSubmitting}
              errors={wdErrors}
            />
          )}

          {activeTab === "withdraw" && wdStep !== "details" && (
            <WithdrawTicketStep
              labelText={ticketLabelText}
              step={wdStep}
              ticket={wdTicket}
              withdrawProcessMinutes={wdTicket?.withdrawProcessMinutes ?? selectedWdCompany?.withdrawProcessMinutes ?? 15}
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./transfersBody.css";
import usePageTitle from "../../hooks/usePageTitle";

import TransferHistoryStep from "./steps/TransferHistoryStep";
import TransferCreateStep from "./steps/TransferCreateStep";
import TransferProcessingStep from "./steps/TransferProcessingStep";
import TransferCompletedStep from "./steps/TransferCompletedStep";
import TransferRejectedStep from "./steps/TransferRejectedStep";

import {
  fetchTransferBrands,
  fetchTransferHistory,
  createTransferTicket,
  fetchTransferTicketStatus,
} from "./api/transfersApi";

function formatCreatedLabel(isoOrDate) {
  if (!isoOrDate) return "-";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} ${dd}-${mo}-${yy}`;
}

function mapStatus(s) {
  if (s === "approved") return "completed";
  if (s === "rejected") return "rejected";
  return "processing";
}

export default function TransfersBody() {
  const navigate = useNavigate();
  usePageTitle("Transfers");

  const [step, setStep] = useState("history");

  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  const [historyRaw, setHistoryRaw] = useState([]);

  const [ticketId, setTicketId] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [rejectedReason, setRejectedReason] = useState("");
  const [errors, setErrors] = useState({});

  const pollingRef = useRef(null);

  const goToHistory = async () => {
    setStep("history");
    setTicketId(null);
    setTicket(null);
    setRejectedReason("");
    setErrors({});

    try {
      const h = await fetchTransferHistory(10);
      setHistoryRaw(h?.transfers ?? []);
    } catch (e) {
      console.error("[Transfers] refresh history failed:", e);
      setHistoryRaw([]);
    }
  };

  const handleClose = () => {
    if (step === "history") {
      navigate("/home");
      return;
    }
    goToHistory();
  };

  const sectionLabel = useMemo(() => {
    if (step === "history") return "Transfer History";
    if (step === "create") return "Create Transfer";
    if (step === "processing") return "Processing Transfer";
    if (step === "completed") return "Transfer Completed";
    if (step === "rejected") return "Transfer Rejected";
    return "Transfers";
  }, [step]);

  const historyItems = useMemo(() => {
    return (historyRaw || []).slice(0, 10).map((t) => ({
      id: t.id,
      username: t.username,
      created: formatCreatedLabel(t.createdAt),
      brand: t.brand,
      amount: String(t.amount || ""),
      status: mapStatus(t.status),
      direction: t.direction,
    }));
  }, [historyRaw]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBrandsLoading(true);
      try {
        const [bRes, hRes] = await Promise.allSettled([
          fetchTransferBrands(),
          fetchTransferHistory(10),
        ]);

        if (cancelled) return;

        if (bRes.status === "fulfilled") {
          setBrands(bRes.value?.brands ?? []);
        } else {
          setBrands([]);
          setErrors((p) => ({ ...p, brands: "Failed to load brands." }));
        }

        if (hRes.status === "fulfilled") {
          setHistoryRaw(hRes.value?.transfers ?? []);
        } else {
          setHistoryRaw([]);
        }
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (step !== "processing" || !ticketId) return;

    const poll = async () => {
      try {
        const data = await fetchTransferTicketStatus(ticketId);
        const status = data?.status;

        if (!status || status === "pending") return;

        if (status === "approved") {
          const tr = data?.transfer || {};
          setTicket((prev) => ({
            ...(prev || {}),
            createdAt: tr.createdAt || prev?.createdAt || "",
            ticket: String(ticketId),
            transfer: tr.direction || prev?.transfer || "",
            brand: tr.brand || prev?.brand || "",
            username: tr.username || prev?.username || "",
            amount: tr.amount || prev?.amount || "",
            status: "completed",
          }));
          setStep("completed");
          return;
        }

        if (status === "rejected") {
          setRejectedReason(data?.reason || "");
          setTicket((prev) => ({
            ...(prev || {}),
            ticket: String(ticketId),
            status: "rejected",
          }));
          setStep("rejected");
        }
      } catch (e) {
        console.error("[Transfers] poll status failed:", e);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [step, ticketId]);

  const handleCreateSubmit = async (payload) => {
    setErrors({});
    setStep("processing");

    try {
      const res = await createTransferTicket(payload);
      const newTicketId = res?.ticketId;
      setTicketId(newTicketId);

      setTicket({
        createdAt: new Date().toISOString(),
        ticket: String(newTicketId || ""),
        transfer: payload.direction,
        brand: payload.brand,
        username: payload.username,
        amount: payload.amount,
        status: "processing",
      });
    } catch (err) {
      setStep("create");
      setErrors((prev) => ({
        ...prev,
        submit: err?.message || "Failed to submit transfer request.",
      }));
    }
  };

  return (
    <section className="jw-transfersPage">
      <div className="jw-transfersCard">
        <div className="jw-transfersHeader">
          <div className="jw-transfersHeaderLeft">
            <span className="jw-transfersIcon">
              <ArrowUpDown size={24} />
            </span>
            <h2 className="jw-transfersTitle">Transfers</h2>
          </div>

          <button className="jw-transfersClose" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="jw-transfersSectionLabel">
          <span className="jw-transfersLine" />
          <span className="jw-transfersLabelText">{sectionLabel}</span>
          <span className="jw-transfersLine" />
        </div>

        {step === "history" && (
          <TransferHistoryStep
            items={historyItems}
            onCreateNew={() => setStep("create")}
          />
        )}

        {step === "create" && (
          <TransferCreateStep
            onCancel={goToHistory}
            onSubmit={handleCreateSubmit}
            brandsAvailable={brands}
          />
        )}

        {step === "processing" && (
          <TransferProcessingStep ticket={ticket} onBack={goToHistory} />
        )}

        {step === "completed" && (
          <TransferCompletedStep ticket={ticket} onGoToHistory={goToHistory} />
        )}

        {step === "rejected" && (
          <TransferRejectedStep
            ticket={{ ...ticket, reason: rejectedReason }}
            onGoToHistory={goToHistory}
          />
        )}
      </div>
    </section>
  );
}

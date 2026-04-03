import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./transfersBody.css";
import usePageTitle from "../../hooks/usePageTitle";

import TransferCreateStep from "./steps/TransferCreateStep";
import TransferProcessingStep from "./steps/TransferProcessingStep";
import TransferCompletedStep from "./steps/TransferCompletedStep";
import TransferRejectedStep from "./steps/TransferRejectedStep";

import {
  fetchTransferBrands,
  createTransferTicket,
  fetchTransferTicketStatus,
} from "./api/transfersApi";

/** API may return `{ name, iconPath }[]` or legacy string[]. */
function normalizeClientTransferBrands(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { name: item, iconPath: null, inProcessMinutes: 15, outProcessMinutes: 15 };
      }
      const name = item?.name != null ? String(item.name) : "";
      const iconPath =
        item?.iconPath != null
          ? String(item.iconPath)
          : item?.icon_path != null
            ? String(item.icon_path)
            : null;
      const inPm =
        item?.inProcessMinutes != null
          ? Number(item.inProcessMinutes)
          : item?.in_process_minutes != null
            ? Number(item.in_process_minutes)
            : 15;
      const outPm =
        item?.outProcessMinutes != null
          ? Number(item.outProcessMinutes)
          : item?.out_process_minutes != null
            ? Number(item.out_process_minutes)
            : 15;
      return {
        name,
        iconPath: iconPath || null,
        inProcessMinutes: Number.isFinite(inPm) && inPm >= 1 ? Math.floor(inPm) : 15,
        outProcessMinutes: Number.isFinite(outPm) && outPm >= 1 ? Math.floor(outPm) : 15,
      };
    })
    .filter((b) => b.name);
}

export default function TransfersBody() {
  const navigate = useNavigate();
  usePageTitle("Transfers");

  const [step, setStep] = useState("create");

  const [brands, setBrands] = useState([]);

  const [ticketId, setTicketId] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [rejectedReason, setRejectedReason] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const pollingRef = useRef(null);

  const resetToCreate = () => {
    setStep("create");
    setTicketId(null);
    setTicket(null);
    setRejectedReason("");
    setErrors({});
  };

  const handleClose = () => {
    if (step === "create") {
      navigate("/home");
      return;
    }
    resetToCreate();
  };

  const sectionLabel = useMemo(() => {
    if (step === "create") return "Create Transfer";
    if (step === "processing") return "Processing Transfer";
    if (step === "completed") return "Transfer Completed";
    if (step === "rejected") return "Transfer Rejected";
    return "Transfers";
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchTransferBrands();
        if (cancelled) return;
        setBrands(normalizeClientTransferBrands(data?.brands ?? []));
      } catch (e) {
        if (!cancelled) {
          setBrands([]);
          setErrors((p) => ({ ...p, brands: "Failed to load brands." }));
        }
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
            clientAccountUsername:
              tr.clientAccountUsername ?? prev?.clientAccountUsername ?? "",
            amount: tr.amount || prev?.amount || "",
            status: "completed",
          }));
          setStep("completed");
          window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
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
          window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
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
    setIsSubmittingTicket(true);

    try {
      const res = await createTransferTicket(payload);
      const newTicketId = res?.ticketId;
      setTicketId(newTicketId);

      const brandRow = brands.find((b) => b.name === payload.brand);
      const inPm = brandRow?.inProcessMinutes ?? 15;
      const outPm = brandRow?.outProcessMinutes ?? 15;

      setTicket({
        createdAt: new Date().toISOString(),
        ticket: String(newTicketId || ""),
        transfer: payload.direction,
        brand: payload.brand,
        clientAccountUsername: payload.username,
        amount: payload.amount,
        status: "processing",
        inProcessMinutes: inPm,
        outProcessMinutes: outPm,
      });
      window.dispatchEvent(new CustomEvent("jw:refresh-balance"));
      setStep("processing");
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err?.message || "Failed to submit transfer request.",
      }));
    } finally {
      setIsSubmittingTicket(false);
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

        {step === "create" && (
          <TransferCreateStep
            onCancel={handleClose}
            onSubmit={handleCreateSubmit}
            brandsAvailable={brands}
            isSubmitting={isSubmittingTicket}
            submitError={errors.submit}
            onClearSubmitError={() => setErrors((prev) => {
              const next = { ...prev };
              delete next.submit;
              return next;
            })}
          />
        )}

        {step === "processing" && (
          <TransferProcessingStep ticket={ticket} onBack={resetToCreate} />
        )}

        {step === "completed" && (
          <TransferCompletedStep ticket={ticket} onGoToHistory={resetToCreate} />
        )}

        {step === "rejected" && (
          <TransferRejectedStep
            ticket={{ ...ticket, reason: rejectedReason }}
            onGoToHistory={resetToCreate}
          />
        )}
      </div>
    </section>
  );
}

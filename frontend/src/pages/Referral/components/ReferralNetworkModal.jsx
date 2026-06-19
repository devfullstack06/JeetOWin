import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

function CountBadge({ value, variant = "row" }) {
  return (
    <span className={`jw-refNetworkModal__badge jw-refNetworkModal__badge--${variant}`}>
      {value}
    </span>
  );
}

function Tier3Row({ node }) {
  return (
    <div className="jw-refNetworkRow jw-refNetworkRow--tier3 jw-refNetworkRow--grid">
      <span className="jw-refNetworkRow__name">{node.username}</span>
    </div>
  );
}

function Tier2Row({ node, expanded, onToggle }) {
  const hasChildren = node.tier3Count > 0;
  return (
    <>
      <button
        type="button"
        className={`jw-refNetworkRow jw-refNetworkRow--tier2 jw-refNetworkRow--grid${hasChildren ? " is-expandable" : ""}`}
        onClick={hasChildren ? onToggle : undefined}
        disabled={!hasChildren}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <span className="jw-refNetworkRow__spacer" aria-hidden />
        <span className="jw-refNetworkRow__name">{node.username}</span>
        <span className="jw-refNetworkRow__countCell">
          <CountBadge value={node.tier3Count} variant="row-tier3" />
        </span>
        <span className="jw-refNetworkRow__chevCell">
          {hasChildren ? (
            <ChevronDown
              size={18}
              className={`jw-refNetworkRow__chev${expanded ? " is-open" : ""}`}
              aria-hidden
            />
          ) : null}
        </span>
      </button>
      {expanded && hasChildren
        ? node.tier3.map((child) => <Tier3Row key={child.clientId} node={child} />)
        : null}
    </>
  );
}

function DirectRow({ node, expanded, onToggle, expandedTier2, onToggleTier2 }) {
  const hasChildren = node.tier2Count > 0;
  return (
    <div className="jw-refNetworkBranch">
      <button
        type="button"
        className={`jw-refNetworkRow jw-refNetworkRow--tier1 jw-refNetworkRow--grid${hasChildren ? " is-expandable" : ""}`}
        onClick={hasChildren ? onToggle : undefined}
        disabled={!hasChildren}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        <span className="jw-refNetworkRow__name">{node.username}</span>
        <span className="jw-refNetworkRow__countCell">
          <CountBadge value={node.tier2Count} variant="row-tier2" />
        </span>
        <span className="jw-refNetworkRow__countCell">
          <CountBadge value={node.tier3Count} variant="row-tier3" />
        </span>
        <span className="jw-refNetworkRow__chevCell">
          {hasChildren ? (
            <ChevronDown
              size={18}
              className={`jw-refNetworkRow__chev${expanded ? " is-open" : ""}`}
              aria-hidden
            />
          ) : null}
        </span>
      </button>
      {expanded && hasChildren
        ? node.tier2.map((child) => (
            <Tier2Row
              key={child.clientId}
              node={child}
              expanded={expandedTier2.has(child.clientId)}
              onToggle={() => onToggleTier2(child.clientId)}
            />
          ))
        : null}
    </div>
  );
}

export default function ReferralNetworkModal({ open, totals, direct = [], onClose }) {
  const [expandedDirect, setExpandedDirect] = useState(() => new Set());
  const [expandedTier2, setExpandedTier2] = useState(() => new Set());

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setExpandedDirect(new Set());
      setExpandedTier2(new Set());
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const t1 = totals?.tier1 ?? 0;
  const t2 = totals?.tier2 ?? 0;
  const t3 = totals?.tier3 ?? 0;

  const toggleDirect = (clientId) => {
    setExpandedDirect((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleTier2 = (clientId) => {
    setExpandedTier2((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  return createPortal(
    <div
      className="jw-refDetailsOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Referral Details"
    >
      <button type="button" className="jw-refDetailsBackdrop" aria-label="Close" onClick={onClose} />
      <div className="jw-refNetworkModal" onClick={(e) => e.stopPropagation()}>
        <div className="jw-refNetworkModal__titleBar">
          <h3 className="jw-refNetworkModal__title">Referral Details</h3>
          <button
            type="button"
            className="jw-refNetworkModal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="jw-refNetworkModal__headerGrid" aria-label="Referral totals">
          <div className="jw-refNetworkModal__headerCell">
            <span className="jw-refNetworkModal__headerLabel">Direct</span>
            <CountBadge value={t1} variant="header-tier1" />
          </div>
          <div className="jw-refNetworkModal__headerCell is-center">
            <span className="jw-refNetworkModal__headerLabel">Tier 2</span>
            <CountBadge value={t2} variant="header-tier2" />
          </div>
          <div className="jw-refNetworkModal__headerCell is-center">
            <span className="jw-refNetworkModal__headerLabel">Tier 3</span>
            <CountBadge value={t3} variant="header-tier3" />
          </div>
          <span className="jw-refNetworkModal__headerChevSpacer" aria-hidden />
        </div>

        <div className="jw-refNetworkModal__headerRule" aria-hidden />

        <div className="jw-refNetworkModal__body">
          {direct.length === 0 ? (
            <p className="jw-refNetworkModal__empty">No referrals yet.</p>
          ) : (
            direct.map((node) => (
              <DirectRow
                key={node.clientId}
                node={node}
                expanded={expandedDirect.has(node.clientId)}
                onToggle={() => toggleDirect(node.clientId)}
                expandedTier2={expandedTier2}
                onToggleTier2={toggleTier2}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

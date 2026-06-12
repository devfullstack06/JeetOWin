import React, { useState } from "react";
import { Copy, Check, Share2, Send, UserCheck, BadgePercent } from "lucide-react";
import ShareJeetOWinModal from "../../../components/ShareJeetOWinModal";
import ReferralDetailsModal from "./ReferralDetailsModal";

const STEP_ICONS = [Send, UserCheck, BadgePercent];

async function copyReferralCode(text) {
  const value = String(text || "");
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function formatRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return String(n).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
}

export default function OverviewTabPanel({ overview }) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const steps = overview?.steps || [];
  const rates = overview?.tierRates || {};

  const onCopyCode = async () => {
    const ok = await copyReferralCode(overview.referralCode);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <div className="jw-refPanelContent jw-refOverview">
        <section className="jw-refOverviewSection">
          <h3 className="jw-refOverviewLead">{overview.overviewLead}</h3>

          <div className="jw-refTierRates" aria-label="Referral tier commission rates">
            <div className="jw-refTierRates__title">Your commission rates:</div>
            <div className="jw-refTierRates__grid">
              <div className="jw-refTierRates__tile jw-refTierRates__tile--tier1">
                <div className="jw-refTierRates__line">
                  <span className="jw-refTierRates__label">Direct (Tier 1):</span>
                  <span className="jw-refTierRates__value">{formatRate(rates.tier1)}%</span>
                </div>
              </div>
              <div className="jw-refTierRates__tile jw-refTierRates__tile--tier2">
                <div className="jw-refTierRates__line">
                  <span className="jw-refTierRates__label">Tier 2:</span>
                  <span className="jw-refTierRates__value">{formatRate(rates.tier2)}%</span>
                </div>
              </div>
              <div className="jw-refTierRates__tile jw-refTierRates__tile--tier3">
                <div className="jw-refTierRates__line">
                  <span className="jw-refTierRates__label">Tier 3:</span>
                  <span className="jw-refTierRates__value">{formatRate(rates.tier3)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="jw-refOverviewField">
            <div className="jw-refOverviewFieldLabel">Your Referral Code:</div>
            <div className="jw-refCodeTile">
              <span className="jw-refCodeTile__text">{overview.referralCode}</span>
              <button
                type="button"
                className={`jw-refCodeTile__copy ${copied ? "is-done" : ""}`}
                onClick={onCopyCode}
                aria-label={copied ? "Copied" : "Copy referral code"}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="jw-refOverviewField jw-refOverviewField--share">
            <div className="jw-refOverviewFieldLabel">Share your link:</div>
            <button
              type="button"
              className="jw-refShareBtn"
              onClick={() => setShareOpen(true)}
              aria-label="Share your referral link"
            >
              <Share2 size={22} />
            </button>
          </div>
        </section>

        <section className="jw-refOverviewSection">
          <h3 className="jw-refOverviewSectionTitle">How to earn lifetime rewards</h3>
          <div className="jw-refEarnSteps">
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index] || Send;
              return (
                <article key={step.title || index} className="jw-refEarnStep">
                  <div className="jw-refEarnStep__num" aria-hidden="true">
                    {index + 1}
                  </div>
                  <div className="jw-refEarnStep__text">
                    <div className="jw-refEarnStep__title">{step.title}</div>
                    <div className="jw-refEarnStep__sub">{step.subtitle}</div>
                  </div>
                  <div className="jw-refEarnStep__iconWrap" aria-hidden="true">
                    <Icon size={28} strokeWidth={1.75} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="jw-refOverviewSection jw-refOverviewSection--info">
          <p className="jw-refOverviewInfo">{overview.infoParagraph}</p>
          <button type="button" className="jw-refMoreDetailsBtn" onClick={() => setDetailsOpen(true)}>
            More Details
          </button>
        </section>
      </div>

      <ShareJeetOWinModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={overview.shareUrl}
      />
      <ReferralDetailsModal
        open={detailsOpen}
        title={overview.detailsModalTitle}
        body={overview.detailsModalBody}
        onClose={() => setDetailsOpen(false)}
      />
    </>
  );
}

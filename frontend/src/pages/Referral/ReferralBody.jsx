import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePageTitle from "../../hooks/usePageTitle";

import ReferralTabs from "./components/ReferralTabs";
import ReferralTabPanel from "./components/ReferralTabPanel";
import OverviewTabPanel from "./components/OverviewTabPanel";
import CommissionTabPanel from "./components/CommissionTabPanel";
import {
  fetchReferralOverview,
  fetchReferralStats,
  fetchReferralCommission,
  fetchReferralDownline,
} from "../../services/referralApi";

import "./referralBody.css";

export default function ReferralBody() {
  const navigate = useNavigate();
  usePageTitle("Referral Program");

  const [activeTab, setActiveTab] = useState("overview");
  const [tierFilter, setTierFilter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [referralStats, setReferralStats] = useState({ summary: {}, rows: [] });
  const [referralDownline, setReferralDownline] = useState(null);
  const [programEnabled, setProgramEnabled] = useState(false);
  const [commission, setCommission] = useState({ overall: {}, byMonth: [] });

  useEffect(() => {
    let cancelled = false;
    fetchReferralOverview()
      .then((data) => {
        if (!cancelled) setProgramEnabled(!!data?.isProgramEnabled);
      })
      .catch(() => {
        if (!cancelled) setProgramEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const load = async () => {
      try {
        if (activeTab === "overview") {
          const data = await fetchReferralOverview();
          if (!cancelled) setOverview(data);
        } else if (activeTab === "referral") {
          const [statsData, downlineData] = await Promise.all([
            fetchReferralStats({ tier: tierFilter }),
            programEnabled ? fetchReferralDownline() : Promise.resolve(null),
          ]);
          if (!cancelled) {
            setReferralStats(statsData);
            setReferralDownline(downlineData);
          }
        } else {
          const data = await fetchReferralCommission();
          if (!cancelled) setCommission(data);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load referral data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, tierFilter, programEnabled]);

  const handleClose = () => {
    navigate("/home");
  };

  return (
    <section className="jw-refPage" aria-label="Referral Program">
      <div className="jw-refCard">
        <div className="jw-refHeader">
          <div className="jw-refHeaderLeft">
            <span className="jw-refIcon" aria-hidden="true">
              <Users size={24} />
            </span>
            <h2 className="jw-refTitle">Referral Program</h2>
          </div>

          <button type="button" className="jw-refClose" aria-label="Close" onClick={handleClose}>
            ×
          </button>
        </div>

        <ReferralTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        <div className="jw-refBodyPanel" role="tabpanel">
          {error ? <p className="jw-refError">{error}</p> : null}
          {loading ? <p className="jw-refLoading">Loading…</p> : null}

          {!loading && activeTab === "referral" ? (
            <ReferralTabPanel
              summary={referralStats.summary}
              rows={referralStats.rows}
              monthLabel={referralStats.monthLabel}
              tierFilter={tierFilter}
              onTierFilterChange={setTierFilter}
              downline={referralDownline}
              showReferralDetails={programEnabled}
            />
          ) : null}
          {!loading && activeTab === "overview" && overview ? (
            <OverviewTabPanel overview={overview} />
          ) : null}
          {!loading && activeTab === "commission" ? (
            <CommissionTabPanel overall={commission.overall} rows={commission.byMonth} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

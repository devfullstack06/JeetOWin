import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import AdminPagination from "../../components/AdminPagination/AdminPagination";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import ReferralDetailsRichEditor from "../../components/ReferralDetailsRichEditor";
import {
  fetchReferralSettings,
  patchReferralSettings,
  fetchAdminReferrers,
  patchAdminReferrer,
  fetchAdminBrandRules,
  postAdminBrandRule,
  fetchAdminAccrualPreview,
  runAdminAccrual,
} from "../../services/referralAdminApi";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "../Promotions/managePromosPage.css";
import "../Notifications/announcementsTab.css";
import "./referralPage.css";

const TABS = [
  { key: "settings", label: "Program settings" },
  { key: "referrers", label: "Referrers" },
  { key: "brands", label: "Brand rules" },
  { key: "accruals", label: "Accruals" },
];

function ReferrerStatusBadge({ status }) {
  const key = status === "disabled" ? "disabled" : "active";
  return <span className={`jw-adminRefStatus is-${key}`}>{status || "active"}</span>;
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

function formatTierOverrideDisplay(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
}

function TierOverridesModal({
  open,
  row,
  form,
  defaults,
  saving,
  errorText,
  onClose,
  onChange,
  onClear,
  onSave,
}) {
  if (!open || !row) return null;

  const defaultLabel = (key) => {
    const n = Number(defaults?.[key]);
    return Number.isFinite(n) ? `${n}%` : "program default";
  };

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit tier overrides"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Tier rate overrides</div>
        </div>

        <div className="jw-adminUsersModal__body">
          <p className="jw-adminRefTierModal__intro">
            Set custom commission rates for this referrer. Leave a tier blank to use the program
            default. Changes apply to future accrual months only.
          </p>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Referrer</label>
            <input className="jw-adminUsersModal__input is-readonly" value={row.username} readOnly />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Referral code</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={row.referralCode || ""}
              readOnly
            />
          </div>
          <div className="jw-adminRefTierModal__grid">
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Tier 1 — Direct (%)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="jw-adminUsersModal__input"
                value={form.tier1}
                onChange={(e) => onChange("tier1", e.target.value)}
                placeholder={`Default: ${defaultLabel("tier1Rate")}`}
              />
            </div>
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Tier 2 (%)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="jw-adminUsersModal__input"
                value={form.tier2}
                onChange={(e) => onChange("tier2", e.target.value)}
                placeholder={`Default: ${defaultLabel("tier2Rate")}`}
              />
            </div>
            <div className="jw-adminUsersModal__field">
              <label className="jw-adminUsersModal__label">Tier 3 (%)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="jw-adminUsersModal__input"
                value={form.tier3}
                onChange={(e) => onChange("tier3", e.target.value)}
                placeholder={`Default: ${defaultLabel("tier3Rate")}`}
              />
            </div>
          </div>
          {errorText ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
        </div>

        <div className="jw-adminRefTierModal__footer">
          <button type="button" className="jw-adminBtn is-light" onClick={onClear} disabled={saving}>
            Clear all
          </button>
          <div className="jw-adminRefTierModal__footerRight">
            <button type="button" className="jw-adminBtn is-light" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="jw-adminBtn is-green" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save overrides"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageReferrerPage() {
  const [tab, setTab] = useState("settings");
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [referrerFilters, setReferrerFilters] = useState({ q: "" });
  const [referrerApplied, setReferrerApplied] = useState({ q: "" });
  const [referrers, setReferrers] = useState([]);
  const [referrerTotal, setReferrerTotal] = useState(0);
  const [referrerPage, setReferrerPage] = useState(1);
  const [referrerPageSize, setReferrerPageSize] = useState(25);
  const [referrersLoading, setReferrersLoading] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [tierModalRow, setTierModalRow] = useState(null);
  const [tierForm, setTierForm] = useState({ tier1: "", tier2: "", tier3: "" });
  const [tierSaving, setTierSaving] = useState(false);
  const [tierModalError, setTierModalError] = useState("");

  const [brandRules, setBrandRules] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandForm, setBrandForm] = useState({ brandId: "", isIncluded: false });
  const [brandSaving, setBrandSaving] = useState(false);

  const [accrualMonth, setAccrualMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [accrualAppliedMonth, setAccrualAppliedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [accruals, setAccruals] = useState([]);
  const [accrualsLoading, setAccrualsLoading] = useState(false);
  const [accrualRunning, setAccrualRunning] = useState(false);
  const [detailsEditorKey, setDetailsEditorKey] = useState(0);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const s = await fetchReferralSettings();
      setSettings(s);
      setDetailsEditorKey((k) => k + 1);
    } catch (e) {
      setErrorText(e.message || "Failed to load settings.");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadReferrers = useCallback(async () => {
    setReferrersLoading(true);
    setErrorText("");
    try {
      const offset = (referrerPage - 1) * referrerPageSize;
      const data = await fetchAdminReferrers({
        q: referrerApplied.q,
        limit: referrerPageSize,
        offset,
      });
      setReferrers(data.items || []);
      setReferrerTotal(Number(data.total) || 0);
    } catch (e) {
      setErrorText(e.message || "Failed to load referrers.");
      setReferrers([]);
      setReferrerTotal(0);
    } finally {
      setReferrersLoading(false);
    }
  }, [referrerApplied.q, referrerPage, referrerPageSize]);

  const loadBrandRules = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const items = await fetchAdminBrandRules();
      setBrandRules(items);
    } catch (e) {
      setErrorText(e.message || "Failed to load brand rules.");
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    const token = localStorage.getItem("token") || "";
    const res = await fetch("/api/admin/brands?pageSize=200", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    setBrands(Array.isArray(data?.items) ? data.items : []);
  }, []);

  const loadAccruals = useCallback(async () => {
    setAccrualsLoading(true);
    try {
      const d = await fetchAdminAccrualPreview(accrualAppliedMonth);
      setAccruals(d.items || []);
    } catch (e) {
      setErrorText(e.message || "Failed to load accruals.");
      setAccruals([]);
    } finally {
      setAccrualsLoading(false);
    }
  }, [accrualAppliedMonth]);

  useEffect(() => {
    loadSettings().catch(() => {});
    loadBrands().catch(() => {});
  }, [loadSettings, loadBrands]);

  useEffect(() => {
    if (tab !== "referrers") return;
    loadReferrers();
  }, [tab, loadReferrers]);

  useEffect(() => {
    if (tab !== "brands") return;
    loadBrandRules();
  }, [tab, loadBrandRules]);

  useEffect(() => {
    if (tab !== "accruals") return;
    loadAccruals();
  }, [tab, loadAccruals]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveFlash(false);
    setErrorText("");
    try {
      const updated = await patchReferralSettings(settings);
      setSettings(updated);
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 3000);
    } catch (e) {
      setErrorText(e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleReferrer = async (row, disabled, stopAccruals) => {
    setErrorText("");
    try {
      await patchAdminReferrer(row.clientId, {
        referrerStatus: disabled ? "disabled" : "active",
        stopAccruals: !!stopAccruals,
      });
      await loadReferrers();
    } catch (e) {
      setErrorText(e.message || "Failed to update referrer.");
    }
  };

  const openTierModal = (row) => {
    setTierModalRow(row);
    setTierForm({
      tier1: row.tier1Override != null ? String(row.tier1Override) : "",
      tier2: row.tier2Override != null ? String(row.tier2Override) : "",
      tier3: row.tier3Override != null ? String(row.tier3Override) : "",
    });
    setTierModalError("");
    setTierModalOpen(true);
  };

  const closeTierModal = () => {
    if (tierSaving) return;
    setTierModalOpen(false);
    setTierModalRow(null);
    setTierModalError("");
  };

  const parseTierInput = (value) => {
    if (value === "" || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  };

  const saveTierOverrides = async () => {
    if (!tierModalRow) return;
    const tier1Override = parseTierInput(tierForm.tier1);
    const tier2Override = parseTierInput(tierForm.tier2);
    const tier3Override = parseTierInput(tierForm.tier3);
    if ([tier1Override, tier2Override, tier3Override].some((v) => Number.isNaN(v))) {
      setTierModalError("Enter valid numbers or leave blank to use the program default.");
      return;
    }
    setTierSaving(true);
    setTierModalError("");
    try {
      await patchAdminReferrer(tierModalRow.clientId, {
        tier1Override,
        tier2Override,
        tier3Override,
      });
      setTierModalOpen(false);
      setTierModalRow(null);
      await loadReferrers();
    } catch (e) {
      setTierModalError(e.message || "Failed to save tier overrides.");
    } finally {
      setTierSaving(false);
    }
  };

  const addBrandRule = async () => {
    if (!brandForm.brandId) {
      setErrorText("Select a brand first.");
      return;
    }
    setBrandSaving(true);
    setErrorText("");
    try {
      await postAdminBrandRule({
        scope: "global",
        brandId: Number(brandForm.brandId),
        isIncluded: brandForm.isIncluded,
      });
      setBrandForm({ brandId: "", isIncluded: false });
      await loadBrandRules();
    } catch (e) {
      setErrorText(e.message || "Failed to create brand rule.");
    } finally {
      setBrandSaving(false);
    }
  };

  const runAccrual = async () => {
    setAccrualRunning(true);
    setErrorText("");
    try {
      await runAdminAccrual(accrualAppliedMonth);
      await loadAccruals();
    } catch (e) {
      setErrorText(e.message || "Accrual run failed.");
    } finally {
      setAccrualRunning(false);
    }
  };

  const referrerDisplayRows = useMemo(() => {
    if (referrersLoading && referrers.length === 0) return [{ id: "loading-row" }];
    if (!referrersLoading && referrers.length === 0) return [{ id: "empty-row" }];
    return referrers;
  }, [referrers, referrersLoading]);

  const brandDisplayRows = useMemo(() => {
    if (brandsLoading && brandRules.length === 0) return [{ id: "loading-row" }];
    if (!brandsLoading && brandRules.length === 0) return [{ id: "empty-row" }];
    return brandRules;
  }, [brandRules, brandsLoading]);

  const accrualDisplayRows = useMemo(() => {
    if (accrualsLoading && accruals.length === 0) return [{ id: "loading-row" }];
    if (!accrualsLoading && accruals.length === 0) return [{ id: "empty-row" }];
    return accruals;
  }, [accruals, accrualsLoading]);

  const filters =
    tab === "referrers" ? (
      <AdminFilterBar
        onSubmit={() => {
          setReferrerApplied({ ...referrerFilters });
          setReferrerPage(1);
        }}
        onClear={() => {
          setReferrerFilters({ q: "" });
          setReferrerApplied({ q: "" });
          setReferrerPage(1);
        }}
      >
        <AdminFilterField label="Search">
          <AdminInput
            value={referrerFilters.q}
            onChange={(v) => setReferrerFilters({ q: v })}
            placeholder="Username or referral code"
          />
        </AdminFilterField>
      </AdminFilterBar>
    ) : tab === "brands" ? (
      <AdminFilterBar
        actions={
          <>
            <AdminButton variant="light" onClick={() => setBrandForm({ brandId: "", isIncluded: false })}>
              Clear
            </AdminButton>
            <AdminButton variant="green" onClick={addBrandRule} disabled={brandSaving}>
              {brandSaving ? "Adding…" : "Add rule"}
            </AdminButton>
          </>
        }
      >
        <AdminFilterField label="Brand">
          <select
            className="jw-adminInput"
            value={brandForm.brandId}
            onChange={(e) => setBrandForm((f) => ({ ...f, brandId: e.target.value }))}
          >
            <option value="">Please Select</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Rule">
          <select
            className="jw-adminInput"
            value={brandForm.isIncluded ? "include" : "exclude"}
            onChange={(e) => setBrandForm((f) => ({ ...f, isIncluded: e.target.value === "include" }))}
          >
            <option value="exclude">Exclude globally</option>
            <option value="include">Include globally</option>
          </select>
        </AdminFilterField>
      </AdminFilterBar>
    ) : tab === "accruals" ? (
      <AdminFilterBar
        onSubmit={() => setAccrualAppliedMonth(accrualMonth)}
        onClear={() => {
          const now = new Date().toISOString().slice(0, 7);
          setAccrualMonth(now);
          setAccrualAppliedMonth(now);
        }}
        actionsAddon={
          <AdminButton variant="green" onClick={runAccrual} disabled={accrualRunning}>
            {accrualRunning ? "Running…" : "Run accrual"}
          </AdminButton>
        }
      >
        <AdminFilterField label="Month">
          <input
            type="month"
            className="jw-adminInput"
            value={accrualMonth}
            onChange={(e) => setAccrualMonth(e.target.value)}
          />
        </AdminFilterField>
      </AdminFilterBar>
    ) : null;

  const settingsPanel =
    tab === "settings" ? (
      <div className="jw-adminRefSettings">
        <div className="jw-adminRefSettings__head">
          <h3 className="jw-adminRefSettings__title">Referral program configuration</h3>
          <p className="jw-adminRefSettings__sub">
            Tier rates, client overview copy, share link template, and accrual go-live month (Karachi).
          </p>
        </div>
        {settingsLoading ? (
          <div className="jw-adminSkeleton" style={{ height: 280, borderRadius: 8 }} />
        ) : settings ? (
          <>
            <div className="jw-adminRefFormGrid">
              <div className="jw-adminUsersModal__field jw-adminRefFormGrid__full">
                <label className="jw-adminUsersModal__label">
                  <input
                    type="checkbox"
                    checked={!!settings.isEnabled}
                    onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  Program enabled
                </label>
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Accrual start month</label>
                <input
                  type="month"
                  className="jw-adminUsersModal__input"
                  value={settings.accrualStartMonth || ""}
                  onChange={(e) => setSettings({ ...settings, accrualStartMonth: e.target.value })}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Share URL template</label>
                <input
                  className="jw-adminUsersModal__input"
                  value={settings.shareUrlTemplate || ""}
                  onChange={(e) => setSettings({ ...settings, shareUrlTemplate: e.target.value })}
                  placeholder="https://www.jeetowin.com/signup?ref={code}"
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Tier 1 rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  className="jw-adminUsersModal__input"
                  value={settings.tier1Rate}
                  onChange={(e) => setSettings({ ...settings, tier1Rate: Number(e.target.value) })}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Tier 2 rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  className="jw-adminUsersModal__input"
                  value={settings.tier2Rate}
                  onChange={(e) => setSettings({ ...settings, tier2Rate: Number(e.target.value) })}
                />
              </div>
              <div className="jw-adminUsersModal__field">
                <label className="jw-adminUsersModal__label">Tier 3 rate (%)</label>
                <input
                  type="number"
                  step="0.001"
                  className="jw-adminUsersModal__input"
                  value={settings.tier3Rate}
                  onChange={(e) => setSettings({ ...settings, tier3Rate: Number(e.target.value) })}
                />
              </div>
              <div className="jw-adminUsersModal__field jw-adminRefFormGrid__full">
                <label className="jw-adminUsersModal__label">Overview lead</label>
                <input
                  className="jw-adminUsersModal__input"
                  value={settings.overviewLead || ""}
                  onChange={(e) => setSettings({ ...settings, overviewLead: e.target.value })}
                />
              </div>
              <div className="jw-adminUsersModal__field jw-adminRefFormGrid__full">
                <label className="jw-adminUsersModal__label">Info paragraph</label>
                <textarea
                  className="jw-adminUsersModal__input jw-adminUsersModal__textarea"
                  rows={3}
                  value={settings.overviewInfo || ""}
                  onChange={(e) => setSettings({ ...settings, overviewInfo: e.target.value })}
                />
              </div>
            </div>

            <div className="jw-adminRefDetailsSection">
              <div className="jw-adminRefDetailsSection__head">
                <h4 className="jw-adminRefDetailsSection__title">More details modal (client)</h4>
                <p className="jw-adminRefDetailsSection__sub">
                  Shown when clients tap &quot;More Details&quot; on the Referral Program overview tab.
                </p>
              </div>
              <div className="jw-adminUsersModal__field jw-adminRefFormGrid__full">
                <label className="jw-adminUsersModal__label">Modal title</label>
                <input
                  className="jw-adminUsersModal__input"
                  value={settings.detailsModalTitle || ""}
                  onChange={(e) => setSettings({ ...settings, detailsModalTitle: e.target.value })}
                  placeholder="Referral program details"
                />
              </div>
              <div className="jw-adminUsersModal__field jw-adminRefFormGrid__full">
                <label className="jw-adminUsersModal__label">Modal content</label>
                <ReferralDetailsRichEditor
                  key={detailsEditorKey}
                  initialHtml={settings.detailsModalBody || ""}
                  previewTitle={settings.detailsModalTitle || "Referral program details"}
                  onHtmlChange={(html) =>
                    setSettings((prev) => (prev ? { ...prev, detailsModalBody: html } : prev))
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="jw-adminRefFormActions">
              <button
                type="button"
                className={`jw-adminBtn is-green jw-adminRefSaveBtn${saveFlash ? " is-saved" : ""}`}
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? "Saving…" : saveFlash ? "Saved" : "Save settings"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    ) : null;

  const referrersTable =
    tab === "referrers" ? (
      <div className="jw-adminRefTableSection">
        <div className="jw-adminTableWrap">
          <table className="jw-adminTable">
            <thead>
              <tr>
                <th>Username</th>
                <th>Referral code</th>
                <th>Status</th>
                <th>Tier overrides (1 / 2 / 3)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrerDisplayRows.length === 1 && referrerDisplayRows[0]?.id === "loading-row" ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="jw-adminSkeleton" style={{ height: 20 }} />
                    </td>
                  </tr>
                ))
              ) : referrerDisplayRows.length === 1 && referrerDisplayRows[0]?.id === "empty-row" ? (
                <tr>
                  <td colSpan={5} className="jw-adminEmpty">
                    No referrers found
                  </td>
                </tr>
              ) : (
                referrerDisplayRows.map((r) => (
                  <tr key={r.clientId}>
                    <td className="jw-adminTd__username">
                      <span className="jw-adminLinkLike">{r.username}</span>
                    </td>
                    <td>{r.referralCode}</td>
                    <td>
                      <ReferrerStatusBadge status={r.referrerStatus} />
                    </td>
                    <td>
                      <div className="jw-adminRefTierCell">
                        <span className="jw-adminRefTierCell__values">
                          {[r.tier1Override, r.tier2Override, r.tier3Override]
                            .map((x) => formatTierOverrideDisplay(x))
                            .join(" / ")}
                        </span>
                        <button
                          type="button"
                          className="jw-adminRefTierCell__edit"
                          onClick={() => openTierModal(r)}
                        >
                          Edit rates
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="jw-adminRefActionGroup">
                        <AdminButton variant="light" onClick={() => onToggleReferrer(r, true, false)}>
                          Disable (keep accrual)
                        </AdminButton>
                        <AdminButton variant="light" onClick={() => onToggleReferrer(r, true, true)}>
                          Disable (stop accrual)
                        </AdminButton>
                        <AdminButton variant="green" onClick={() => onToggleReferrer(r, false, false)}>
                          Enable
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  const brandsTable =
    tab === "brands" ? (
      <div className="jw-adminRefTableSection">
        <div className="jw-adminTableWrap">
          <table className="jw-adminTable">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Scope</th>
                <th>Included</th>
                <th>Effective from</th>
              </tr>
            </thead>
            <tbody>
              {brandDisplayRows.length === 1 && brandDisplayRows[0]?.id === "loading-row" ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4}>
                      <div className="jw-adminSkeleton" style={{ height: 20 }} />
                    </td>
                  </tr>
                ))
              ) : brandDisplayRows.length === 1 && brandDisplayRows[0]?.id === "empty-row" ? (
                <tr>
                  <td colSpan={4} className="jw-adminEmpty">
                    No brand rules yet — all brands are included by default
                  </td>
                </tr>
              ) : (
                brandDisplayRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.brandName}</td>
                    <td className="jw-adminTd__capitalize">{r.scope}</td>
                    <td>{r.isIncluded ? "Yes" : "No"}</td>
                    <td className="jw-adminTd__date">{formatAdminDateTime(r.effectiveFrom)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  const accrualsTable =
    tab === "accruals" ? (
      <div className="jw-adminRefTableSection">
        <div className="jw-adminRefTableSection__head">
          <h3 className="jw-adminRefTableSection__title">Accrual preview — {accrualAppliedMonth}</h3>
          <p className="jw-adminRefTableSection__sub">TRI − TRO net, 3-tier commission for the selected Karachi month.</p>
        </div>
        <div className="jw-adminTableWrap">
          <table className="jw-adminTable">
            <thead>
              <tr>
                <th>Earner</th>
                <th>Source</th>
                <th>Tier</th>
                <th>Transfer in</th>
                <th>Transfer out</th>
                <th>Net</th>
                <th>Rate</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              {accrualDisplayRows.length === 1 && accrualDisplayRows[0]?.id === "loading-row" ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8}>
                      <div className="jw-adminSkeleton" style={{ height: 20 }} />
                    </td>
                  </tr>
                ))
              ) : accrualDisplayRows.length === 1 && accrualDisplayRows[0]?.id === "empty-row" ? (
                <tr>
                  <td colSpan={8} className="jw-adminEmpty">
                    No accruals for this month — run accrual after the month ends
                  </td>
                </tr>
              ) : (
                accrualDisplayRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.earnerUsername}</td>
                    <td>{r.sourceUsername}</td>
                    <td>{r.tier}</td>
                    <td>{formatMoney(r.transferIn)}</td>
                    <td>{formatMoney(r.transferOut)}</td>
                    <td>{formatMoney(r.net)}</td>
                    <td>{r.rate}%</td>
                    <td>{formatMoney(r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  const pagination =
    tab === "referrers" ? (
      <AdminPagination
        total={referrerTotal}
        page={referrerPage}
        pageSize={referrerPageSize}
        onPageChange={setReferrerPage}
        onPageSizeChange={(n) => {
          setReferrerPageSize(n);
          setReferrerPage(1);
        }}
      />
    ) : null;

  return (
    <>
      <TierOverridesModal
        open={tierModalOpen}
        row={tierModalRow}
        form={tierForm}
        defaults={settings}
        saving={tierSaving}
        errorText={tierModalError}
        onClose={closeTierModal}
        onChange={(key, value) => setTierForm((prev) => ({ ...prev, [key]: value }))}
        onClear={() => setTierForm({ tier1: "", tier2: "", tier3: "" })}
        onSave={saveTierOverrides}
      />
      <AdminPageShell
        title="Manage Referrer"
        tabs={<AdminTabs tabs={TABS} activeKey={tab} onChange={setTab} />}
        filters={filters}
        table={
          <>
            {errorText ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
            {settingsPanel}
            {referrersTable}
            {brandsTable}
            {accrualsTable}
          </>
        }
        pagination={pagination}
      />
    </>
  );
}

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import AdminFilterBar, { AdminButton, AdminInput, AdminFilterField } from "../../components/AdminFilterBar/AdminFilterBar";
import { affiliateAdminApi } from "../../services/affiliateAdminApi";
import {
  AffiliateIntegratedLayout,
  AffiliateTablePagination,
  formatMoney,
  AdminTableViewBtn,
  IntegratedAdminTable,
  StatusBadge,
  useClientPagination,
} from "./affiliateAdminShared";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "../Wallets/walletsPage.css";
import "./affiliateTab.css";

export default function AffiliatesTab() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [applied, setApplied] = useState({ search: "", status: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", name: "", email: "", phone: "",
    planId: "1", commissionMaturityDays: 30, status: "pending",
  });
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    const q = {};
    if (applied.search) q.search = applied.search;
    if (applied.status) q.status = applied.status;
    affiliateAdminApi
      .getAffiliates(q)
      .then((d) => setRows(d.affiliates || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [applied]);
  useEffect(() => {
    affiliateAdminApi.getPlans().then((d) => {
      const list = d.plans || [];
      setPlans(list);
      if (list.length && form.planId === "1") {
        setForm((f) => ({ ...f, planId: String(list[0].id) }));
      }
    }).catch(() => {});
  }, []);

  async function createAffiliate(e) {
    e.preventDefault();
    setError("");
    try {
      await affiliateAdminApi.createAffiliate({
        ...form,
        planId: Number(form.planId),
        commissionMaturityDays: Number(form.commissionMaturityDays),
      });
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const { total, pageRows } = useClientPagination(rows, page, pageSize);

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "username", label: "Username" },
    { key: "referralCode", label: "Referral Code" },
    { key: "planName", label: "Plan" },
    { key: "commissionMaturityDays", label: "Maturity", render: (r) => `${r.commissionMaturityDays}d` },
    { key: "players", label: "Players" },
    { key: "transferIn", label: "Transfer IN", render: (r) => formatMoney(r.transferIn) },
    { key: "transferOut", label: "Transfer OUT", render: (r) => formatMoney(r.transferOut) },
    { key: "netAmount", label: "Net", render: (r) => formatMoney(r.netAmount) },
    { key: "commission", label: "Commission", render: (r) => formatMoney(r.commission) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "joined", label: "Joined", render: (r) => String(r.joined || "").slice(0, 10) },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <AdminTableViewBtn
          title="View affiliate"
          onClick={() => navigate(`/admin/affiliate/affiliates/${r.id}`)}
        />
      ),
    },
  ];

  const filterBar = (
    <AdminFilterBar
      onSubmit={() => { setApplied({ ...filters }); setPage(1); }}
      onClear={() => {
        setFilters({ search: "", status: "" });
        setApplied({ search: "", status: "" });
        setPage(1);
      }}
    >
      <AdminFilterField label="Search">
        <AdminInput value={filters.search} onChange={(v) => setFilters((f) => ({ ...f, search: v }))} placeholder="Name, username, code" />
      </AdminFilterField>
      <AdminFilterField label="Status">
        <select
          className={`jw-adminInput ${!filters.status ? "jw-adminInput--placeholder" : ""}`}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </AdminFilterField>
      <AdminFilterField label="">
        <AdminButton variant="green" onClick={() => setShowCreate(true)}>
          <span className="jw-adminCreateBtnInner">
            Create <Plus size={16} style={{ marginLeft: 4 }} />
          </span>
        </AdminButton>
      </AdminFilterField>
    </AdminFilterBar>
  );

  return (
    <>
      <AffiliateIntegratedLayout
        filters={filterBar}
        error={error}
        pagination={(
          <AffiliateTablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          />
        )}
      >
        <IntegratedAdminTable columns={columns} rows={pageRows} loading={loading} emptyText="No affiliates found." />
      </AffiliateIntegratedLayout>
      {showCreate
        ? createPortal(
          <div className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader" onClick={() => setShowCreate(false)}>
            <form className="jw-adminUsersModal jw-adminUsersModal--scrollable" onClick={(e) => e.stopPropagation()} onSubmit={createAffiliate}>
              <div className="jw-adminUsersModal__header"><div className="jw-adminUsersModal__title">Create Affiliate</div></div>
              <div className="jw-adminUsersModal__body">
                {["username", "password", "name", "email", "phone"].map((k) => (
                  <div className="jw-adminUsersModal__field" key={k}>
                    <label className="jw-adminUsersModal__label">{k}</label>
                    <input
                      className="jw-adminUsersModal__input"
                      type={k === "password" ? "password" : "text"}
                      value={form[k]}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      required={k === "username" || k === "password" || k === "name"}
                    />
                  </div>
                ))}
                <div className="jw-adminUsersModal__field">
                  <label className="jw-adminUsersModal__label">Commission Plan</label>
                  <select className="jw-adminUsersModal__input" value={form.planId} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}>
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name} ({pl.commissionPercent}%)</option>
                    ))}
                  </select>
                </div>
                <div className="jw-adminUsersModal__field">
                  <label className="jw-adminUsersModal__label">Maturity Days</label>
                  <select className="jw-adminUsersModal__input" value={form.commissionMaturityDays} onChange={(e) => setForm((f) => ({ ...f, commissionMaturityDays: Number(e.target.value) }))}>
                    <option value={7}>7</option>
                    <option value={14}>14</option>
                    <option value={30}>30</option>
                  </select>
                </div>
                <div className="jw-adminUsersModal__field">
                  <label className="jw-adminUsersModal__label">Status</label>
                  <select className="jw-adminUsersModal__input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="jw-adminUsersModal__actions">
                <button type="button" className="jw-adminUsersModal__btn is-light" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="jw-adminUsersModal__btn is-green">Create</button>
              </div>
            </form>
          </div>,
          document.body
        )
        : null}
    </>
  );
}

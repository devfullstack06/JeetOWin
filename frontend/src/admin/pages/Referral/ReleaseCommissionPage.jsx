import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageShell from "../../components/AdminPageShell/AdminPageShell";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import AdminFilterBar, {
  AdminFilterField,
  AdminInput,
  AdminButton,
} from "../../components/AdminFilterBar/AdminFilterBar";
import { formatAdminDateTime } from "../../utils/adminDateUtils";
import {
  fetchReleaseQueue,
  postReleaseCommission,
  fetchReleaseHistory,
} from "../../services/referralAdminApi";
import "../../components/AdminFilterBar/adminFilterBar.css";
import "../../components/AdminTable/adminTable.css";
import "../Users/usersPage.css";
import "./referralPage.css";

const TABS = [
  { key: "queue", label: "Release queue" },
  { key: "history", label: "Release history" },
];

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
}

function ReleaseModal({ open, row, amount, note, releasing, errorText, onClose, onChange, onConfirm }) {
  if (!open || !row) return null;

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
        aria-label="Release commission"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title">Release commission</div>
        </div>

        <div className="jw-adminUsersModal__body">
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Referrer</label>
            <input className="jw-adminUsersModal__input is-readonly" value={row.username} readOnly />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Referral code</label>
            <input className="jw-adminUsersModal__input is-readonly" value={row.referralCode || ""} readOnly />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Releasable balance</label>
            <input
              className="jw-adminUsersModal__input is-readonly"
              value={formatMoney(row.releasable)}
              readOnly
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Release amount</label>
            <input
              type="number"
              className="jw-adminUsersModal__input"
              value={amount}
              onChange={(e) => onChange("amount", e.target.value)}
              placeholder="Partial amount"
              min="0"
              step="1"
            />
          </div>
          <div className="jw-adminUsersModal__field">
            <label className="jw-adminUsersModal__label">Note (optional)</label>
            <input
              className="jw-adminUsersModal__input"
              value={note}
              onChange={(e) => onChange("note", e.target.value)}
              placeholder="Internal note"
            />
          </div>
          {errorText ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
        </div>

        <div
          className="jw-adminUsersModal__footer"
          style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 22px 20px" }}
        >
          <button type="button" className="jw-adminBtn is-light" onClick={onClose} disabled={releasing}>
            Cancel
          </button>
          <button type="button" className="jw-adminBtn is-green" onClick={onConfirm} disabled={releasing}>
            {releasing ? "Releasing…" : "Credit wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReleaseCommissionPage() {
  const [tab, setTab] = useState("queue");
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [historyQ, setHistoryQ] = useState("");
  const [historyApplied, setHistoryApplied] = useState("");

  const [releaseOpen, setReleaseOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText("");
    try {
      const [q, h] = await Promise.all([fetchReleaseQueue(), fetchReleaseHistory()]);
      setQueue(q);
      setHistory(h);
    } catch (e) {
      setErrorText(e.message || "Failed to load release data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredHistory = useMemo(() => {
    const q = historyApplied.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) =>
        String(r.username || "").toLowerCase().includes(q) ||
        String(r.note || "").toLowerCase().includes(q)
    );
  }, [history, historyApplied]);

  const queueDisplayRows = useMemo(() => {
    if (loading && queue.length === 0) return [{ id: "loading-row" }];
    if (!loading && queue.length === 0) return [{ id: "empty-row" }];
    return queue;
  }, [queue, loading]);

  const historyDisplayRows = useMemo(() => {
    if (loading && filteredHistory.length === 0) return [{ id: "loading-row" }];
    if (!loading && filteredHistory.length === 0) return [{ id: "empty-row" }];
    return filteredHistory;
  }, [filteredHistory, loading]);

  const openRelease = (row) => {
    setSelected(row);
    setAmount(String(row.releasable > 0 ? row.releasable : ""));
    setNote("");
    setReleaseError("");
    setReleaseOpen(true);
  };

  const closeRelease = () => {
    if (releasing) return;
    setReleaseOpen(false);
    setSelected(null);
    setReleaseError("");
  };

  const onRelease = async () => {
    if (!selected) return;
    setReleasing(true);
    setReleaseError("");
    try {
      await postReleaseCommission({
        clientId: selected.clientId,
        amount: Number(amount),
        note,
      });
      setReleaseOpen(false);
      setSelected(null);
      await load();
    } catch (e) {
      setReleaseError(e.message || "Release failed.");
    } finally {
      setReleasing(false);
    }
  };

  const filters =
    tab === "history" ? (
      <AdminFilterBar
        onSubmit={() => setHistoryApplied(historyQ)}
        onClear={() => {
          setHistoryQ("");
          setHistoryApplied("");
        }}
      >
        <AdminFilterField label="Search">
          <AdminInput
            value={historyQ}
            onChange={setHistoryQ}
            placeholder="Username or note"
          />
        </AdminFilterField>
      </AdminFilterBar>
    ) : (
      <AdminFilterBar
        summary={`${queue.length} referrer${queue.length === 1 ? "" : "s"} with commission activity`}
        actions={
          <AdminButton variant="light" onClick={() => load()} disabled={loading}>
            Refresh
          </AdminButton>
        }
      />
    );

  const queueTable =
    tab === "queue" ? (
      <div className="jw-adminRefTableSection">
        <div className="jw-adminRefTableSection__head">
          <h3 className="jw-adminRefTableSection__title">Pending release</h3>
          <p className="jw-adminRefTableSection__sub">
            Partial releases credit the client main wallet. Releasable = max(0, earned − withdrawn).
          </p>
        </div>
        <div className="jw-adminTableWrap">
          <table className="jw-adminTable">
            <thead>
              <tr>
                <th>Username</th>
                <th>Referral code</th>
                <th>Earned</th>
                <th>Withdrawn</th>
                <th>Balance</th>
                <th>Releasable</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queueDisplayRows.length === 1 && queueDisplayRows[0]?.id === "loading-row" ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}>
                      <div className="jw-adminSkeleton" style={{ height: 20 }} />
                    </td>
                  </tr>
                ))
              ) : queueDisplayRows.length === 1 && queueDisplayRows[0]?.id === "empty-row" ? (
                <tr>
                  <td colSpan={7} className="jw-adminEmpty">
                    No referrers with commission balance
                  </td>
                </tr>
              ) : (
                queueDisplayRows.map((r) => (
                  <tr key={r.clientId} className={selected?.clientId === r.clientId ? "is-selected" : ""}>
                    <td className="jw-adminTd__username">
                      <span className="jw-adminLinkLike">{r.username}</span>
                    </td>
                    <td>{r.referralCode}</td>
                    <td>{formatMoney(r.earned)}</td>
                    <td>{formatMoney(r.withdrawn)}</td>
                    <td>{formatMoney(r.balance)}</td>
                    <td>{formatMoney(r.releasable)}</td>
                    <td>
                      <AdminButton
                        variant="green"
                        onClick={() => openRelease(r)}
                        disabled={Number(r.releasable) <= 0}
                      >
                        Release
                      </AdminButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  const historyTable =
    tab === "history" ? (
      <div className="jw-adminRefTableSection">
        <div className="jw-adminTableWrap">
          <table className="jw-adminTable">
            <thead>
              <tr>
                <th>Username</th>
                <th>Amount</th>
                <th>Negative handling</th>
                <th>Note</th>
                <th>Released at</th>
              </tr>
            </thead>
            <tbody>
              {historyDisplayRows.length === 1 && historyDisplayRows[0]?.id === "loading-row" ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5}>
                      <div className="jw-adminSkeleton" style={{ height: 20 }} />
                    </td>
                  </tr>
                ))
              ) : historyDisplayRows.length === 1 && historyDisplayRows[0]?.id === "empty-row" ? (
                <tr>
                  <td colSpan={5} className="jw-adminEmpty">
                    No release history yet
                  </td>
                </tr>
              ) : (
                historyDisplayRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.username}</td>
                    <td>{formatMoney(r.amount)}</td>
                    <td>{r.negativeHandling || "—"}</td>
                    <td>{r.note || "—"}</td>
                    <td className="jw-adminTd__date">{formatAdminDateTime(r.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  return (
    <>
      <AdminPageShell
        title="Release Commission"
        tabs={<AdminTabs tabs={TABS} activeKey={tab} onChange={setTab} />}
        filters={filters}
        table={
          <>
            {errorText ? <div className="jw-adminUsersPage__notice is-error">{errorText}</div> : null}
            {queueTable}
            {historyTable}
          </>
        }
      />

      <ReleaseModal
        open={releaseOpen}
        row={selected}
        amount={amount}
        note={note}
        releasing={releasing}
        errorText={releaseError}
        onClose={closeRelease}
        onChange={(field, value) => {
          if (field === "amount") setAmount(value);
          if (field === "note") setNote(value);
        }}
        onConfirm={onRelease}
      />
    </>
  );
}

import React from "react";
import "./adminTable.css";

function SortIcon({ dir }) {
  return (
    <span className={`jw-adminSortIcon ${dir ? "is-on" : ""}`}>
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M4 2 L6 0 L8 2 Z" fill={dir === "asc" ? "#333" : "#bbb"} />
        <path d="M4 10 L6 12 L8 10 Z" fill={dir === "desc" ? "#333" : "#bbb"} />
      </svg>
    </span>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path
        fill="#15a84b"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}

function SkeletonCell() {
  return <div className="jw-adminSkeleton" />;
}

export default function AdminTable({
  columns = [],
  rows = [],
  sort,
  onSort,
  onEdit,
}) {
  const isLoading = rows.length === 1 && rows[0].id === "loading-row";
  const isEmpty = rows.length === 1 && rows[0].id === "empty-row";

  return (
    <div className="jw-adminTableWrap">
      <table className="jw-adminTable">
        <thead>
          <tr>
            {columns.map((c) => {
              const sortable = !!c.sortKey;
              const dir = sort?.key === c.sortKey ? sort?.dir : null;

              return (
                <th
                  key={c.key}
                  className={c.thClassName || ""}
                  onClick={() => {
                    if (!sortable) return;
                    onSort?.(c.sortKey);
                  }}
                  role={sortable ? "button" : undefined}
                  tabIndex={sortable ? 0 : undefined}
                >
                  <span className="jw-adminThInner">
                    {c.header}
                    {sortable && <SortIcon dir={dir} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map((c) => (
                  <td key={c.key}>
                    <SkeletonCell />
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="jw-adminEmpty">
                No results found
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="jw-adminTd__username">
                  <span className="jw-adminLinkLike">{r.username}</span>
                </td>

                <td>{r.name}</td>
                <td>{r.contact}</td>
                <td>{r.balance}</td>

                <td>
                  <span
                    className={`jw-adminStatus ${
                      r.status === "Active" ? "is-active" : "is-inactive"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>

                <td className="jw-adminTd__date">{r.joinDateText}</td>

                <td className="jw-adminTd__actions">
                  <button
                    type="button"
                    className="jw-adminEditBtn"
                    title="Edit"
                    onClick={() => onEdit?.(r)}
                  >
                    <EditIcon />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
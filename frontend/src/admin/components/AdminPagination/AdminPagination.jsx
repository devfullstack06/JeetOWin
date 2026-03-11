import React, { useMemo } from "react";
import "./adminPagination.css";

function IconBtn({ children, disabled, onClick, title }) {
  return (
    <button
      type="button"
      className="jw-adminPagerBtn"
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export default function AdminPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  const pages = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= totalPages; i++) arr.push(i);
    return arr;
  }, [totalPages]);

  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div className="jw-adminPagination">
      <div className="jw-adminPagination__left">
        <IconBtn
          title="First"
          disabled={!canPrev}
          onClick={() => onPageChange?.(1)}
        >
          «
        </IconBtn>
        <IconBtn
          title="Prev"
          disabled={!canPrev}
          onClick={() => onPageChange?.(safePage - 1)}
        >
          ‹
        </IconBtn>

        <div className="jw-adminPagination__range">
          {start} - {end} of {total}
        </div>

        <IconBtn
          title="Next"
          disabled={!canNext}
          onClick={() => onPageChange?.(safePage + 1)}
        >
          ›
        </IconBtn>
        <IconBtn
          title="Last"
          disabled={!canNext}
          onClick={() => onPageChange?.(totalPages)}
        >
          »
        </IconBtn>

        <select
          className="jw-adminPagination__pageSelect"
          value={safePage}
          onChange={(e) => onPageChange?.(Number(e.target.value))}
          aria-label="Page"
        >
          {pages.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="jw-adminPagination__right">
        <div className="jw-adminPagination__rowsLbl">Rows per page:</div>
        <select
          className="jw-adminPagination__rowsSelect"
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
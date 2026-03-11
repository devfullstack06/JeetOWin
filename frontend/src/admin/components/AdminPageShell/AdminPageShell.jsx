import React from "react";
import "./adminPageShell.css";

export default function AdminPageShell({
  title,
  tabs,
  filters,
  table,
  pagination,
}) {
  return (
    <div className="jw-adminPageShell">
      <div className="jw-adminPageShell__title">{title}</div>

      {tabs ? <div className="jw-adminPageShell__tabs">{tabs}</div> : null}

      {filters ? (
        <div className="jw-adminPageShell__filters">{filters}</div>
      ) : null}

      {table ? <div className="jw-adminPageShell__table">{table}</div> : null}

      {pagination ? (
        <div className="jw-adminPageShell__pagination">{pagination}</div>
      ) : null}
    </div>
  );
}
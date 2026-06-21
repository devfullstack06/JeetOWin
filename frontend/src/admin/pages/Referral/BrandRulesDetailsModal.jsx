import React from "react";

function BrandRuleStatusBadge({ included }) {
  return (
    <span className={`jw-adminRefBrandStatus ${included ? "is-included" : "is-excluded"}`}>
      {included ? "Included" : "Excluded"}
    </span>
  );
}

export function resolveCurrentGlobalBrandStatus(brandId, rules, at = new Date()) {
  const sorted = [...(rules || [])]
    .filter((r) => Number(r.brandId) === Number(brandId))
    .sort((a, b) => {
      const da = new Date(a.effectiveFrom).getTime();
      const db = new Date(b.effectiveFrom).getTime();
      if (da !== db) return da - db;
      return Number(a.id) - Number(b.id);
    });

  let globalRule = null;
  for (const r of sorted) {
    const eff = new Date(r.effectiveFrom);
    if (Number.isNaN(eff.getTime()) || eff > at) continue;
    globalRule = r;
  }

  return globalRule ? !!globalRule.isIncluded : true;
}

export default function BrandRulesDetailsModal({ open, rows = [], onClose }) {
  if (!open) return null;

  return (
    <div
      className="jw-adminUsersModalOverlay jw-adminUsersModalOverlay--belowHeader"
      onClick={onClose}
    >
      <div
        className="jw-adminUsersModal jw-adminUsersModal--scrollable jw-adminRefBrandDetailsModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jw-admin-brand-details-title"
      >
        <div className="jw-adminUsersModal__header">
          <div className="jw-adminUsersModal__title" id="jw-admin-brand-details-title">
            Brand rule details
          </div>
        </div>

        <div className="jw-adminUsersModal__body">
          <p className="jw-adminRefBrandDetailsModal__intro">
            Current global inclusion status for each brand. Brands with no rule are included by default.
          </p>

          <div className="jw-adminTableWrap">
            <table className="jw-adminTable jw-adminRefBrandDetailsTable">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th className="jw-adminRefBrandDetailsTable__statusHead">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="jw-adminEmpty">
                      No brands found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.brandId}>
                      <td>{row.brandName}</td>
                      <td className="jw-adminRefBrandDetailsTable__statusCell">
                        <BrandRuleStatusBadge included={row.isIncluded} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="jw-adminUsersModal__actions">
          <button type="button" className="jw-adminUsersModal__btn is-light" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

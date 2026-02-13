import React from "react";

function statusToRowClass(status) {
  if (status === "completed") return "is-green";
  if (status === "processing") return "is-yellow";
  return "is-red";
}

export default function TransferHistoryStep({ items = [], onCreateNew, onOpenItem }) {
  return (
    <>
      <div className="jw-transfersCreateNewWrap">
        <button className="jw-transfersCreateNew" onClick={onCreateNew} type="button">
          <div>Create New</div>
          <div className="jw-transfersCreatePlus">＋</div>
        </button>
      </div>

      <div className="jw-transfersHistoryStep">
        <div className="jw-transfersListWrap">
          <div className="jw-transfersListHeader">
            <div>Username</div>
            <div>Created</div>
            <div>Brand</div>
            <div style={{ textAlign: "right" }}>Amount</div>
          </div>

          {items.length === 0 ? (
            <div className="jw-transfersEmpty">No transfers yet.</div>
          ) : (
            <div className="jw-transfersRows">
              {items.slice(0, 10).map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="jw-transferRowBtn"
                  onClick={() => onOpenItem?.(it)}
                >
                  <div className={`jw-transferRow ${statusToRowClass(it.status)}`}>
                    <div>{it.username}</div>
                    <div>{it.created}</div>
                    <div className="jw-transferBrand">{it.brand}</div>
                    <div className="jw-transferAmount">{it.amount}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

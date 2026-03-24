import React from "react";
import { formatTransferClientAccountUsername } from "../transferAmountFormat";

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
            <div className="jw-transferHistoryColAccount">Account</div>
            <div className="jw-transferHistoryColCreatedAt">Created at</div>
            <div className="jw-transferHistoryColType">Type</div>
            <div className="jw-transferHistoryColBrand">Brand</div>
            <div className="jw-transferHistoryColAmount">Amount</div>
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
                    <div className="jw-transferHistoryColAccount">
                      {formatTransferClientAccountUsername(it)}
                    </div>
                    <div className="jw-transferHistoryColCreatedAt">{it.created}</div>
                    <div className="jw-transferHistoryColType jw-transferType">{it.typeLabel}</div>
                    <div className="jw-transferHistoryColBrand jw-transferBrand">{it.brand}</div>
                    <div className="jw-transferHistoryColAmount jw-transferAmount">{it.amount}</div>
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

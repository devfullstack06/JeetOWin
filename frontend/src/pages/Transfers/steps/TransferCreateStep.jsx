import React, { useEffect, useMemo, useState } from "react";
import { fetchTransferAccountsByBrand } from "../api/transfersApi";
import { getWalletIconUrl } from "../../../utils/walletIconUrl";
import { digitsOnlyFromInput, formatDigitsPkForInput } from "../transferAmountFormat";

function TransferBrandLogo({ iconSrc, label }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (iconSrc && !imgFailed) {
    return (
      <img
        src={iconSrc}
        alt=""
        className="jw-transferBrandLogoImg"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return label.slice(0, 2).toUpperCase();
}

export default function TransferCreateStep({ onCancel, onSubmit, brandsAvailable = [] }) {
  const brands = useMemo(() => {
    return (brandsAvailable || [])
      .map((entry) => {
        const label =
          typeof entry === "string" ? entry : entry?.name != null ? String(entry.name) : "";
        const iconPath =
          typeof entry === "string"
            ? null
            : entry?.iconPath != null
              ? String(entry.iconPath)
              : entry?.icon_path != null
                ? String(entry.icon_path)
                : null;
        const iconSrc = getWalletIconUrl({ iconPath: iconPath || undefined });
        return { id: label, label, iconSrc };
      })
      .filter((b) => b.label);
  }, [brandsAvailable]);

  const [selectedBrand, setSelectedBrand] = useState(brands[0]?.label || "");
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [activeAccountId, setActiveAccountId] = useState(null);
  const [direction, setDirection] = useState(null); // "IN" | "OUT"
  /** Digits only (no commas); display uses formatDigitsPkForInput */
  const [amountDigits, setAmountDigits] = useState("");
  const [error, setError] = useState("");

  // choose first brand when brands load
  useEffect(() => {
    if (!selectedBrand && brands.length > 0) {
      setSelectedBrand(brands[0].label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands.length]);

  // fetch accounts when brand changes
  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      if (!selectedBrand) {
        setAccounts([]);
        return;
      }
      setLoadingAccounts(true);
      try {
        const data = await fetchTransferAccountsByBrand(selectedBrand);
        if (cancelled) return;
        setAccounts(data?.accounts ?? []);
      } catch (e) {
        console.error("[Transfers] fetch accounts by brand failed:", e);
        if (!cancelled) setAccounts([]);
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    }

    // reset row action on brand switch
    cancelRowAction();
    loadAccounts();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand]);

  const startRowAction = (accountId, dir) => {
    setError("");
    setActiveAccountId(accountId);
    setDirection(dir);
    setAmountDigits("");
  };

  function cancelRowAction() {
    setError("");
    setActiveAccountId(null);
    setDirection(null);
    setAmountDigits("");
  }

  const handleSubmit = (account) => {
    const cleaned = digitsOnlyFromInput(amountDigits);
    if (!cleaned || Number(cleaned) <= 0) {
      setError("Please enter amount.");
      return;
    }
    if (!selectedBrand) {
      setError("Please select a brand.");
      return;
    }
    if (!direction) {
      setError("Please select IN/OUT.");
      return;
    }

    onSubmit?.({
      brand: selectedBrand,
      accountId: account.id,
      username: account.username,
      direction,
      amount: cleaned,
    });
  };

  return (
    <div className="jw-transfersFormOuter">
      <div className="jw-transfersFormPanel">
        {/* TOP: Brands */}
        <div className="jw-transferBrandsHead">
          <div className="jw-transferBrandsTitle">Brands</div>
          <div className="jw-transferBrandsSub">Select your Account&apos;s Brand</div>
        </div>

        <div className="jw-transferBrandRow" role="list" aria-label="Brands">
          {brands.length === 0 ? (
            <div className="jw-transfersEmpty">No brands available.</div>
          ) : (
            brands.map((b) => {
              const active = b.label === selectedBrand;
              return (
                <button
                  key={b.id}
                  type="button"
                  className={`jw-transferBrandTile ${active ? "is-active" : ""}`}
                  onClick={() => setSelectedBrand(b.label)}
                >
                  <div className="jw-transferBrandLogo" aria-hidden="true">
                    <TransferBrandLogo iconSrc={b.iconSrc} label={b.label} />
                  </div>
                  <div className="jw-transferBrandLabel">{b.label}</div>
                </button>
              );
            })
          )}
        </div>

        {/* TABLE HEADER */}
        <div className="jw-transferTableHeader">
          <div>Account</div>
          <div className="jw-transferTableHeaderRight">Action</div>
        </div>

        {/* LIST */}
        <div className="jw-transferCreateList" role="list" aria-label="Accounts list">
          {loadingAccounts ? (
            <div className="jw-transfersEmpty">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="jw-transfersEmpty">No accounts found for this brand.</div>
          ) : (
            accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;

              return (
                <div key={acc.id} className="jw-transferAccountRow" role="listitem">
                  <div className="jw-transferAccountTop">
                    <div className="jw-transferUsername">{acc.username}</div>

                    {!isActive ? (
                      <div className="jw-transferActionBtns">
                        <button
                          type="button"
                          className="jw-transferBtnIn"
                          onClick={() => startRowAction(acc.id, "IN")}
                        >
                          In
                        </button>
                        <button
                          type="button"
                          className="jw-transferBtnOut"
                          onClick={() => startRowAction(acc.id, "OUT")}
                        >
                          Out
                        </button>
                      </div>
                    ) : (
                      <div className="jw-transferActionActive">
                        <div className="jw-transferActionText">
                          Transfer {direction === "IN" ? "In" : "Out"}
                        </div>
                        <button
                          type="button"
                          className="jw-transferRowClose"
                          aria-label="Cancel"
                          onClick={cancelRowAction}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div className="jw-transferAccountBottom">
                      <input
                        className="jw-transferAmountInput"
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter Amount"
                        value={formatDigitsPkForInput(amountDigits)}
                        onChange={(e) => {
                          setError("");
                          setAmountDigits(digitsOnlyFromInput(e.target.value));
                        }}
                      />

                      <button
                        type="button"
                        className="jw-transferSubmitBtn"
                        onClick={() => handleSubmit(acc)}
                      >
                        Submit
                      </button>

                      {error && (
                        <div className="jw-transferInlineError" role="alert">
                          {error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM: Cancel */}
        <div className="jw-transferCreateActions">
          <button type="button" className="jw-btn jw-btnCancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import TransactionsTabs from "../../components/TransactionsTabs";
import CompanyTilesRow from "../../components/CompanyTilesRow";
import AmountInputRow from "../../components/AmountInputRow";
import QuickAmountRow from "../../components/QuickAmountRow";
import CopyButton from "../../components/CopyButton";

export default function DepositDetailsStep({
  activeTab,
  onTabChange,

  companies,
  selectedCompanyId,
  onSelectCompany,

  activeWallet,
  amount,
  setAmount,

  slipFile,
  slipPreviewUrl,
  onPickSlip,
  onClear,

  onSubmit,
  submitting,
  errors,
}) {
  const minAmount = activeWallet?.minAmount ?? 500;

  const quickAmounts = useMemo(() => {
    return activeWallet?.quickAmounts?.length
      ? activeWallet.quickAmounts
      : [500, 1000, 5000, 10000];
  }, [activeWallet]);

  const [fileInputKey, setFileInputKey] = useState(1);

  const resetAll = () => {
    onClear?.();
    setFileInputKey((k) => k + 1);
  };

  return (
    <div className="jw-txStep">
      {/* ✅ Tabs shown on details screen */}
      <TransactionsTabs activeTab={activeTab} onChangeTab={onTabChange} />
      <div className="jw-txStepContentWithButtons">
      <div className="jw-txStepContainer">
        <div className="jw-txStepTitleContainer">
          <div className="jw-txStepTitle is-deposit">Deposit</div>
          <div className="jw-txStepSub">Select Payment Method</div>
        </div>
        <div className="jw-txStepContent">
          <CompanyTilesRow
            items={companies}
            selectedId={selectedCompanyId}
            onSelect={onSelectCompany}
          />

          {selectedCompanyId && !activeWallet ? (
            <div className="jw-txNoWallet">
              No Wallet available for this company. Kindly choose another Wallet.
            </div>
          ) : (
            <>
              <div className="jw-txWalletPanel">
                <div className="jw-txWalletLeft">
                  <div className="jw-txWalletName">
                    {activeWallet?.holderName || "-"}
                  </div>
                  <div className="jw-txWalletNumberRow">
                    <div className="jw-txWalletNumber">
                      {activeWallet?.holderNumber || "-"}
                    </div>
                    <CopyButton textToCopy={activeWallet?.holderNumber || ""} />
                  </div>
                </div>

                {activeWallet?.qrImagePath && (
                  <div className="jw-txWalletQR">
                    <img
                      src={`/uploads/qr/${activeWallet.qrImagePath}`}
                      alt="Deposit QR"
                      className="jw-txQRBox"
                    />
                  </div>
                )}
              </div>

              <AmountInputRow
                value={amount}
                onChange={setAmount}
                placeholder="Enter Deposit Amount"
                minText={`Min. Rs. ${Number(minAmount).toLocaleString()}`}
              />
              {errors?.amount && <div className="jw-txErr">{errors.amount}</div>}

              <QuickAmountRow amounts={quickAmounts} onPick={(v) => setAmount(v)} />
              {errors?.quickAmount && (
                <div className="jw-txErr jw-txQuickRowErr" role="alert">
                  {errors.quickAmount}
                </div>
              )}

              <div className="jw-txSlipBox">
                <div className="jw-txSlipInner">
                  <label className="jw-txAttachChip">
                    Attach Deposit Slip
                    <input
                      key={fileInputKey}
                      type="file"
                      accept="image/*"
                      className="jw-txFileInput"
                      onChange={(e) => onPickSlip?.(e.target.files?.[0] || null)}
                    />
                  </label>

                  {slipFile && (
                    <div className="jw-txSlipMeta">
                      <div className="jw-txSlipName">{slipFile.name}</div>
                      {slipPreviewUrl && (
                        <img
                          className="jw-txSlipThumb"
                          src={slipPreviewUrl}
                          alt="Slip preview"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
              {errors?.slip && <div className="jw-txErr">{errors.slip}</div>}
            </>
          )}
        </div>
      </div>
      {selectedCompanyId && activeWallet && (
        <div className="jw-txActions">
          <button type="button" className="jw-txBtn is-cancel" onClick={resetAll}>
            Cancel
          </button>
          <button
            type="button"
            className="jw-txBtn is-submit is-green"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      )}
      </div>

      {errors?.submit && <div className="jw-txErr">{errors.submit}</div>}
    </div>
  );
}

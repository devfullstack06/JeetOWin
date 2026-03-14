import React, { useMemo } from "react";
import TransactionsTabs from "../../components/TransactionsTabs";
import CompanyTilesRow from "../../components/CompanyTilesRow";
import AmountInputRow from "../../components/AmountInputRow";
import QuickAmountRow from "../../components/QuickAmountRow";

export default function WithdrawDetailsStep({
  activeTab,
  onTabChange,

  walletCompanies,
  selectedWalletCompanyId,
  onSelectWalletCompany,

  clientWallets,
  selectedClientWalletId,
  onSelectClientWallet,

  minAmount,
  quickAmounts,

  amount,
  setAmount,

  onClear,
  onSubmit,
  errors,
}) {
  const amounts = useMemo(() => {
    return quickAmounts?.length ? quickAmounts : [500, 1000, 5000, 10000];
  }, [quickAmounts]);

  return (
    <div className="jw-txStep">
      {/* ✅ Tabs shown on details screen */}
      <TransactionsTabs activeTab={activeTab} onChangeTab={onTabChange} />
      <div className="jw-txStepContentWithButtons">
      <div className="jw-txStepContainer">
      <div className="jw-txStepTitleContainer">
        <div className="jw-txStepTitle is-withdraw">Withdraw</div>
      <div className="jw-txStepSub">Select Your Wallet</div>
      </div>
      <div className="jw-txStepContent">
        <CompanyTilesRow
          items={walletCompanies}
          selectedId={selectedWalletCompanyId}
          onSelect={onSelectWalletCompany}
        />

        {selectedWalletCompanyId && !clientWallets?.length ? (
          <div className="jw-txNoWallet">
            No Wallet found for this company. Go to My Wallets page to add a Wallet for your withdraw.
          </div>
        ) : (
          <>
            <div className="jw-txWalletGrid">
              {clientWallets?.length ? (
                clientWallets.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`jw-txUserWalletTile ${selectedClientWalletId === w.id ? "is-active" : ""}`}
                    onClick={() => onSelectClientWallet(w.id)}
                  >
                    <div className="jw-txUserWalletName">{w.account_title || w.accountTitle}</div>
                    <div className="jw-txUserWalletNumber">{w.account_number || w.accountNumber}</div>
                  </button>
                ))
              ) : null}
            </div>
            {errors?.wallet && <div className="jw-txErr">{errors.wallet}</div>}

            <AmountInputRow
              value={amount}
              onChange={setAmount}
              placeholder="Enter Withdrawal Amount"
              minText={`Min. Rs. ${Number(minAmount || 500).toLocaleString()}`}
            />
            {errors?.amount && <div className="jw-txErr">{errors.amount}</div>}

            <QuickAmountRow amounts={amounts} onPick={(v) => setAmount(v)} />
          </>
        )}
      </div>
      </div>
      {selectedWalletCompanyId && clientWallets?.length ? (
        <div className="jw-txActions">
          <button type="button" className="jw-txBtn is-cancel" onClick={onClear}>
            Cancel
          </button>
          <button type="button" className="jw-txBtn is-submit is-yellow" onClick={onSubmit}>
            Submit
          </button>
        </div>
      ) : null}
      </div>

      {errors?.submit && <div className="jw-txErr">{errors.submit}</div>}
    </div>
  );
}

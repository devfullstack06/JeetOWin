import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import DepositTab from "./DepositTab";
import WithdrawTab from "./WithdrawTab";
import TransfersTab from "./TransfersTab";

const TABS = [
  { key: "deposit", label: "Deposit" },
  { key: "withdraw", label: "Withdraw" },
  { key: "transfers", label: "Transfers" },
];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo(() => {
    const p = location.pathname || "";
    if (p.includes("/withdraw")) return "withdraw";
    if (p.includes("/transfers")) return "transfers";
    return "deposit";
  }, [location.pathname]);

  const handleTabChange = (key) => {
    if (key === "deposit") navigate("/admin/transactions/deposit");
    if (key === "withdraw") navigate("/admin/transactions/withdraw");
    if (key === "transfers") navigate("/admin/transactions/transfers");
  };

  return activeTab === "deposit" ? (
    <DepositTab
      title="Transactions"
      tabs={<AdminTabs tabs={TABS} activeKey={activeTab} onChange={handleTabChange} />}
    />
  ) : activeTab === "withdraw" ? (
    <WithdrawTab
      title="Transactions"
      tabs={<AdminTabs tabs={TABS} activeKey={activeTab} onChange={handleTabChange} />}
    />
  ) : (
    <TransfersTab
      title="Transactions"
      tabs={<AdminTabs tabs={TABS} activeKey={activeTab} onChange={handleTabChange} />}
    />
  );
}

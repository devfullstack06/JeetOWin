import React, { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePageTitle from "../../hooks/usePageTitle";

import "./walletsBody.css";

import WalletsListStep from "./steps/WalletsListStep";
import WalletsCreateStep from "./steps/WalletsCreateStep";

import { createWallet, fetchMyWallets, fetchWalletCompanies } from "./api/walletsApi";

export default function WalletsBody() {
  const navigate = useNavigate();
  usePageTitle("My Wallets");

  const [step, setStep] = useState("list"); // list | create

  const [companies, setCompanies] = useState([]);
  const [wallets, setWallets] = useState([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // form
  const [walletCompanyId, setWalletCompanyId] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [errors, setErrors] = useState({});

  const sectionLabel = useMemo(() => {
    return step === "list" ? "My Wallet Details" : "Add New Wallet";
  }, [step]);

  const resetForm = () => {
    setWalletCompanyId("");
    setAccountTitle("");
    setAccountNumber("");
    setErrors({});
  };

  const loadCompanies = async () => {
    const res = await fetchWalletCompanies();
    setCompanies(res?.companies ?? []);
  };

  const loadWallets = async (companyId = selectedCompanyId) => {
    const res = await fetchMyWallets(companyId);
    setWallets(res?.wallets ?? []);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [cRes, wRes] = await Promise.allSettled([
          fetchWalletCompanies(),
          fetchMyWallets(null),
        ]);

        if (cancelled) return;

        if (cRes.status === "fulfilled") setCompanies(cRes.value?.companies ?? []);
        if (wRes.status === "fulfilled") setWallets(wRes.value?.wallets ?? []);
      } catch (e) {
        console.error("[Wallets] initial load failed:", e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const goToList = async () => {
    setStep("list");
    resetForm();
    try {
      await loadWallets(selectedCompanyId);
    } catch (e) {
      console.error("[Wallets] refresh wallets failed:", e);
    }
  };

  // X button behavior
  const handleClose = () => {
    if (step === "list") {
      navigate("/home");
      return;
    }
    setStep("list");
    resetForm();
  };

  const handleAddNew = async () => {
    // ensure companies loaded for dropdown
    if (!companies.length) {
      try { await loadCompanies(); } catch {}
    }
    setStep("create");
    setErrors({});
  };

  const validate = () => {
    const next = {};

    const title = (accountTitle || "").trim();
    const number = (accountNumber || "").trim();

    if (!walletCompanyId) next.walletCompanyId = "Please select a company.";

    // Title: alphabetic only (spaces allowed), 4-50
    if (title.length < 4 || title.length > 50 || !/^[A-Za-z ]+$/.test(title)) {
      next.accountTitle = "Account Title must be alphabetic only and 4-50 characters.";
    }

    // Number: digits only, 6-24
    if (number.length < 6 || number.length > 24 || !/^[0-9]+$/.test(number)) {
      next.accountNumber = "Account Number must be integers only and 6-24 digits.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createWallet({
        walletCompanyId: Number(walletCompanyId),
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
      });

      // after success -> list
      setStep("list");
      resetForm();
      await loadWallets(selectedCompanyId);
    } catch (err) {
      console.error("[Wallets] create failed:", err);
      setErrors((prev) => ({
        ...prev,
        submit: err?.message || "Failed to add wallet.",
      }));
    }
  };

  const onSelectCompanyTile = async (companyIdOrNull) => {
    setSelectedCompanyId(companyIdOrNull);
    try {
      await loadWallets(companyIdOrNull);
    } catch (e) {
      console.error("[Wallets] filter load failed:", e);
    }
  };

  return (
    <section className="jw-walletsPage" aria-label="My Wallets">
      <div className="jw-walletsCard">
        {/* HEADER */}
        <div className="jw-walletsHeader">
          <div className="jw-walletsHeaderLeft">
            <span className="jw-walletsIcon" aria-hidden="true">
              <Wallet size={24} />
            </span>
            <h2 className="jw-walletsTitle">My Wallets</h2>
          </div>

          <button
            type="button"
            className="jw-walletsClose"
            aria-label="Close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* SECTION LABEL */}
        <div className="jw-walletsSectionLabel" aria-hidden="true">
          <span className="jw-walletsLine" />
          <span className="jw-walletsLabelText">{sectionLabel}</span>
          <span className="jw-walletsLine" />
        </div>

        {errors.submit && step === "create" && (
          <div className="jw-submitError" role="alert">
            {errors.submit}
          </div>
        )}

        {step === "list" && (
          <WalletsListStep
            companies={companies}
            wallets={wallets}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={onSelectCompanyTile}
            onAddNew={handleAddNew}
          />
        )}

        {step === "create" && (
          <WalletsCreateStep
            companies={companies}
            walletCompanyId={walletCompanyId}
            setWalletCompanyId={setWalletCompanyId}
            accountTitle={accountTitle}
            setAccountTitle={setAccountTitle}
            accountNumber={accountNumber}
            setAccountNumber={setAccountNumber}
            errors={errors}
            onCancel={goToList}
            onSubmit={onSubmit}
            onClose={() => { setStep("list"); resetForm(); }} // X in create goes list
          />
        )}
      </div>
    </section>
  );
}

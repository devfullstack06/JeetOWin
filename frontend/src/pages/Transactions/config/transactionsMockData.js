// Admin-driven later (DB-ready mock now)

export const paymentCompanies = [
    {
      id: 1,
      name: "JazzCash",
      iconKey: "jazzcash",
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 2,
      name: "EasyPaisa",
      iconKey: "easypaisa",
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 3,
      name: "JazzCash Till ID",
      iconKey: "jazzcash_till",
      sortOrder: 3,
      isActive: true,
    },
    {
      id: 4,
      name: "Bank Transfer",
      iconKey: "bank",
      sortOrder: 4,
      isActive: true,
    },
  ];
  
  // Deposit receiving wallets (admin creates multiple; UI shows 1 randomly per visit)
  export const paymentWallets = [
    {
      id: 101,
      paymentCompanyId: 1,
      holderName: "Muhafiz Khan",
      holderNumber: "03211233211",
      qrValue: "jazzcash://03211233211",
      minAmount: 500,
      quickAmounts: [500, 1000, 5000, 10000],
    },
    {
      id: 102,
      paymentCompanyId: 1,
      holderName: "Ali Khan",
      holderNumber: "03001234567",
      qrValue: "jazzcash://03001234567",
      minAmount: 500,
      quickAmounts: [500, 1000, 5000, 10000],
    },
    {
      id: 201,
      paymentCompanyId: 2,
      holderName: "Support EP",
      holderNumber: "03451234567",
      qrValue: "easypaisa://03451234567",
      minAmount: 500,
      quickAmounts: [500, 1000, 5000, 10000],
    },
    {
      id: 301,
      paymentCompanyId: 3,
      holderName: "Till ID",
      holderNumber: "123456",
      qrValue: "till://123456",
      minAmount: 500,
      quickAmounts: [500, 1000, 5000, 10000],
    },
    {
      id: 401,
      paymentCompanyId: 4,
      holderName: "ABC EXCH",
      holderNumber: "IBAN/ACC: PK00XXXX0000000",
      qrValue: "",
      minAmount: 500,
      quickAmounts: [500, 1000, 5000, 10000],
    },
  ];
  
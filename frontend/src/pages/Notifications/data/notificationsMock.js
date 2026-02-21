// Keep this file data-driven. Later replace with API response.
// Fields: id, type, title, body, createdAt (ISO)

export const notificationsMock = {
    announcements: [
      {
        id: "a1",
        type: "announcement",
        title: "JazzCash deposit is available for 24/7 now.",
        body:
          "JazzCash deposit is available for 24/7 now. Users can enjoy seamless transactions with JazzCash at any hour of the day.\n\n" +
          "JazzCash now offers instant notifications for every deposit made. Users can enjoy seamless transactions.\n\n" +
          "Users can now link multiple bank accounts for more flexibility.\n\n" +
          "New cashback rewards introduced for eligible transactions. New cashback rewards introduced for...",
        createdAt: new Date().toISOString(),
      },
      {
        id: "a2",
        type: "announcement",
        title: "Users can enjoy seamless transactions with JazzCash at any hour of the day.",
        body:
          "Users can enjoy seamless transactions with JazzCash at any hour of the day.",
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: "a3",
        type: "announcement",
        title: "JazzCash now offers instant notifications for every deposit made. Users can enjoy seamless...",
        body:
          "JazzCash now offers instant notifications for every deposit made. Users can enjoy seamless transactions.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "a4",
        type: "announcement",
        title: "Users can now link multiple bank accounts for more flexibility.",
        body:
          "Users can now link multiple bank accounts for more flexibility.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "a5",
        type: "announcement",
        title: "New cashback rewards introduced for eligible transactions. New cashback rewards introduced for...",
        body:
          "New cashback rewards introduced for eligible transactions.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  
    inbox: [
      {
        id: "i1",
        type: "inbox",
        title: "JazzCash deposit is available for 24/7 now.",
        body:
          "JazzCash deposit is available for 24/7 now. Users can enjoy seamless transactions with JazzCash at any hour of the day.\n\n" +
          "JazzCash now offers instant notifications for every deposit made. Users can enjoy seamless transactions.\n\n" +
          "Users can now link multiple bank accounts for more flexibility.\n\n" +
          "New cashback rewards introduced for eligible transactions. New cashback rewards introduced for...",
        createdAt: new Date().toISOString(),
      },
      {
        id: "i2",
        type: "inbox",
        title: "Users can enjoy seamless transactions with JazzCash at any hour of the day.",
        body:
          "Users can enjoy seamless transactions with JazzCash at any hour of the day.",
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: "i3",
        type: "inbox",
        title: "JazzCash now offers instant notifications for every deposit made. Users can enjoy seamless...",
        body:
          "JazzCash now offers instant notifications for every deposit made. Users can enjoy seamless transactions.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "i4",
        type: "inbox",
        title: "In recent updates, JazzCash has enhanced security measures for transactions, providing...",
        body:
          "In recent updates, JazzCash has enhanced security measures for transactions, providing stronger user protection.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 75 * 60 * 1000).toISOString(),
      },
      {
        id: "i5",
        type: "inbox",
        title: "JazzCash introduces a referral program, allowing users to earn rewards for bringing new.",
        body:
          "JazzCash introduces a referral program, allowing users to earn rewards for bringing new users.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(),
      },
    ],
  };
  
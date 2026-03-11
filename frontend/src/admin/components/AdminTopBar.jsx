import React from "react";

export default function AdminTopBar() {
  const fullName = localStorage.getItem("jw:fullName") || "Admin";
  const firstName = fullName.split(" ")[0] || "Admin";

  return (
    <header className="jw-adminTopbar">
      <div className="jw-adminTopbarLeft">
        <div className="jw-adminBrand">
          <div className="jw-adminBrandName">JeetOWin</div>
        </div>

        <div className="jw-adminTicker" title="Ticker / Search placeholder">
          <span className="jw-adminTickerText">Australia edged out India by 3 wickets in their...</span>
        </div>
      </div>

      <div className="jw-adminTopbarRight">
        <button type="button" className="jw-adminProfileBtn" aria-label="Profile menu (placeholder)">
          <span className="jw-adminProfileIcon">👤</span>
          <span className="jw-adminProfileName">{firstName.toLowerCase()}</span>
          <span className="jw-adminProfileCaret">▾</span>
        </button>
      </div>
    </header>
  );
}
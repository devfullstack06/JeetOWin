import React from "react";

export default function AccountsCreatedStep({ createdAccount, onGoToList }) {
  return (
    <div className="jw-waitingOuter">
      <div className="jw-waitingPanel">
        {/* ✅ TOP CONTENT */}
        <div className="jw-waitingContent">
          <div className="jw-waitingTitle">Account created 🎉</div>

          <div className="jw-waitingText">
            Your account has been created successfully.
          </div>

          {createdAccount?.username && (
            <div className="jw-createdBox">
              <div>
                <b>Brand:</b> {createdAccount.brand}
              </div>
              <div>
                <b>Username:</b> {createdAccount.username}
              </div>

              {/* Password may or may not be returned by backend.
                  If you return it (one-time), show it here. */}
              {createdAccount.password && (
                <div>
                  <b>Password:</b> {createdAccount.password}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ BOTTOM ACTION */}
        <div className="jw-waitingActions">
          <button
            type="button"
            className="jw-btn jw-btnSubmit"
            onClick={onGoToList}
            style={{ fontSize: "14px" }}
          >
            Back to Accounts
          </button>
        </div>
      </div>
    </div>
  );
}

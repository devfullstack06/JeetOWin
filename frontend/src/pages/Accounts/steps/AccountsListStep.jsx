import React from "react";

export default function AccountsListStep({ accounts, onCreateNew }) {
  const hasAccounts = accounts.length > 0;

  return (
    <div className="jw-accountsListStep">
      <div className="jw-accountsCreateNewWrap">
        <button
          type="button"
          className="jw-accountsCreateNew"
          onClick={onCreateNew}
        >
          <span>Create New</span>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path
              d="M15 6.25V23.75M6.25 15H23.75"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* List area: header fixed + rows scroll */}
      <div className="jw-accountsListWrap">
        <div className="jw-accountsListHeader">
          <span>Username</span>
          <span>Created</span>
          <span>Brand</span>
          <span>Password</span>
        </div>

        {hasAccounts ? (
          <div className="jw-accountsRows" role="list">
            {accounts.map((acc) => (
              <div key={acc.id} className="jw-accountsRow" role="listitem">
                <span>{acc.username}</span>
                <span>{acc.createdAt ?? "-"}</span>
                <span className="jw-accountsBrand">{acc.brand}</span>

                {/* placeholder: later "Update" can open password reset flow */}
                <button className="jw-accountsUpdate" type="button">
                  Update
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="jw-accountsEmpty">
            No Account created yet. Click on Create New button to create a new
            Account.
          </div>
        )}
      </div>
    </div>
  );
}

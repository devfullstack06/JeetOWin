import React from "react";
import usePageTitle from "../../hooks/usePageTitle";

export default function AdminPlaceholder({ title, crumb }) {
  usePageTitle(title);

  return (
    <section className="jw-adminPage">
      <div className="jw-adminCard">
        <div className="jw-adminCardHead">
          <div className="jw-adminCardTitleWrap">
            <div className="jw-adminCardTitle">{title}</div>
            <div className="jw-adminCardSub">{crumb}</div>
          </div>

          <button
            type="button"
            className="jw-adminGhostBtn"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            title="Scroll to top"
          >
            ⤒
          </button>
        </div>

        <div className="jw-adminDivider" />

        <div className="jw-adminBody">
          <div className="jw-adminPlaceholder">
            <div className="jw-adminPlaceholderTitle">Coming soon</div>
            <div className="jw-adminPlaceholderText">
              This is a placeholder page. Later we’ll connect it to APIs and real CRUD screens.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
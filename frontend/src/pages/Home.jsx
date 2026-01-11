import React from "react";
import LandingHeader from "../components/LandingHeader";
import HomeBanner from "../components/HomeBanner";
import {
  Menu,
  ArrowLeftRight,
  Wallet,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import "./home.css";

function Placeholder({ title }) {
  return (
    <section className="jw-homeSection" aria-label={title}>
      <div className="jw-homeSectionInner">
        <div className="jw-homeSectionTitle">{title}</div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="jw-homePage">
      <LandingHeader />

      {/* BODY GRID */}
      <div className="jw-homeGrid">
        {/* Desktop Left Nav (hidden on mobile) */}
        <aside className="jw-homeNav">
          <div className="jw-homeNavInner">
            <div className="jw-homeNavTitle">Nav Menu</div>
            {/* Later: add hide-in/out for mobile */}
          </div>
        </aside>

        {/* Right Body */}
        <main className="jw-homeBody">
          {/* Row 1: Banner + Right stack */}
          <div className="jw-homeRow1">
            <div className="jw-homeBannerCol">
              <HomeBanner />
            </div>

            <div className="jw-homeRightCol">
              <Placeholder title="Offers & Promotions" />
              <Placeholder title="Top Sports" />
              <Placeholder title="Trending Games" />
              <Placeholder title="Brands Available" />
            </div>
          </div>

          {/* Row 2-4 */}
          <Placeholder title="Leader Board" />
          <Placeholder title="Payment Methods" />
          <Placeholder title="Footer" />
        </main>
      </div>

      {/* Mobile Bottom Nav (same as login page; hidden on desktop) */}
      <footer className="jw-homeBottomNav" aria-label="Bottom navigation">
        <button className="jw-bottomItem" type="button" aria-label="Menu">
          <Menu size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Transactions">
          <ArrowLeftRight size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Wallet">
          <Wallet size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Promotions">
          <Megaphone size={20} />
        </button>
        <button className="jw-bottomItem" type="button" aria-label="Chat">
          <MessageCircle size={20} />
        </button>
      </footer>
    </div>
  );
}

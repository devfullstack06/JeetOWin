import React, { useState, useEffect } from "react";
import LoggedInLayout from "../layouts/LoggedInLayout";
import LandingHeader from "../components/LandingHeader";

import HomeBanner from "../components/HomeBanner";
import TopSports from "../components/TopSports";
import TrendingGames from "../components/TrendingGames";
import BrandsAvailable from "../components/BrandsAvailable";
import OffersPromotions from "../components/OffersPromotions";
import PaymentMethods from "../components/PaymentMethods";
import Footer from "../components/Footer";
import LeaderBoard from "../components/LeaderBoard";
import "./home.css";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in on mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      setIsLoggedIn(!!token && role === "client");
    };

    checkAuth();

    // Listen for storage changes (e.g., logout in another tab)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Home content component (reusable for both layouts)
  const HomeContent = () => (
    <>
      <div className="jw-homeRow1">
        <div className="jw-homeBannerCol">
          <HomeBanner />
        </div>

        <div className="jw-homeRightCol">
          <OffersPromotions />
          <TopSports />
          <TrendingGames />
          <BrandsAvailable />
        </div>
      </div>

      <LeaderBoard />
      <PaymentMethods />
      <Footer />
    </>
  );

  // If logged in, use the full logged-in layout with sidebar
  if (isLoggedIn) {
    return (
      <LoggedInLayout activeId="dashboard">
        <HomeContent />
      </LoggedInLayout>
    );
  }

  // If not logged in, use public layout with just header and content
  return (
    <div className="jw-publicPage">
      <LandingHeader isLoggedIn={false} />
      <main className="jw-publicContent">
        <HomeContent />
      </main>
    </div>
  );
}

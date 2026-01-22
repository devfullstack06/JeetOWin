import React from "react";
import LoggedInLayout from "../layouts/LoggedInLayout";

import HomeBanner from "../components/HomeBanner";
import TopSports from "../components/TopSports";
import TrendingGames from "../components/TrendingGames";
import BrandsAvailable from "../components/BrandsAvailable";
import OffersPromotions from "../components/OffersPromotions";
import PaymentMethods from "../components/PaymentMethods";
import Footer from "../components/Footer";
import LeaderBoard from "../components/LeaderBoard";

export default function Home() {
  return (
    <LoggedInLayout activeId="dashboard">
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
    </LoggedInLayout>
  );
}

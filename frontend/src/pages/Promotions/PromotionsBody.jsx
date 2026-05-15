import React, { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./promotionsBody.css";
import usePageTitle from "../../hooks/usePageTitle";
import PromotionsList from "../../components/promotions/PromotionsList";
import { fetchClientPromotions, logPromotionClick } from "../../services/promotionsApi";

export default function PromotionsBody() {
  const navigate = useNavigate();
  usePageTitle("Promotions");

  const [promos, setPromos] = useState([]);

  useEffect(() => {
    let ignore = false;
    fetchClientPromotions({ placement: "home_rail" })
      .then((rows) => {
        if (!ignore) setPromos(rows);
      })
      .catch(() => {
        if (!ignore) setPromos([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleClose = () => {
    navigate("/home");
  };

  return (
    <section className="jw-promotionsPage" aria-label="Promotions">
      <div className="jw-promotionsCard">
        {/* HEADER */}
        <div className="jw-promotionsHeader">
          <div className="jw-promotionsHeaderLeft">
            <span className="jw-promotionsIcon" aria-hidden="true">
              <Megaphone size={24} />
            </span>
            <h2 className="jw-promotionsTitle">Promotions</h2>
          </div>

          <button
            type="button"
            className="jw-promotionsClose"
            aria-label="Close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* SECTION LABEL */}
        <div className="jw-promotionsSectionLabel" aria-hidden="true">
          <span className="jw-promotionsLine" />
          <span className="jw-promotionsLabelText">All Promotions</span>
          <span className="jw-promotionsLine" />
        </div>

        {/* BODY PANEL (scrollable list inside) */}
        <div className="jw-promotionsPanelOuter">
          <div className="jw-promotionsPanel">
            <div className="jw-promotionsScroll">
              <PromotionsList
                items={promos}
                onCardActivate={(promo) =>
                  logPromotionClick({ promotionId: promo?.id, source: "promotions_page" })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

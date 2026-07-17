import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AffiliateHeader from "../components/AffiliateHeader";
import AffiliateLeftNav from "../components/AffiliateLeftNav";
import { affiliateNavGroups, findAffiliateItemByPath } from "../affiliateNav";
import { startIdleLogout } from "../../utils/idleLogout";
import "../../admin/layouts/adminLoggedInLayout.css";

export default function AffiliateLoggedInLayout({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartRef = useRef(null);

  const role = localStorage.getItem("role") || "";
  const fullName = (localStorage.getItem("jw:fullName") || "").trim();
  const username = (localStorage.getItem("jw:username") || "").trim();
  const firstName = fullName.split(" ").filter(Boolean)[0] || username || "Affiliate";

  const activeItem = useMemo(() => findAffiliateItemByPath(location.pathname), [location.pathname]);

  const activeGroupName = useMemo(() => {
    if (!activeItem) return "";
    for (const g of affiliateNavGroups) {
      if (g.items.some((it) => it.path === activeItem.path)) return g.group;
    }
    return "";
  }, [activeItem]);

  useEffect(() => {
    if (activeGroupName) setOpenGroup(activeGroupName);
  }, [activeGroupName]);

  useEffect(() => {
    if (navOpen) setNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (role && role !== "affiliate") navigate("/login", { replace: true });
  }, [role, navigate]);

  useEffect(() => {
    const stop = startIdleLogout({
      timeoutMs: 3 * 60 * 60 * 1000,
      onLogout: () => navigate("/login", { replace: true }),
    });
    return stop;
  }, [navigate]);

  const isMobile = () => window.matchMedia && window.matchMedia("(max-width: 768px)").matches;

  useEffect(() => {
    const onTouchStart = (ev) => {
      if (!isMobile() || !ev.touches || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, fromEdge: t.clientX <= 24 };
    };
    const onTouchEnd = (ev) => {
      if (!isMobile()) return;
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      const changed = ev.changedTouches && ev.changedTouches[0];
      if (!changed) return;
      const dx = changed.clientX - start.x;
      const dy = changed.clientY - start.y;
      if (Math.abs(dy) > 45) return;
      if (!navOpen && start.fromEdge && dx > 70) setNavOpen(true);
      if (navOpen && dx < -70) setNavOpen(false);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [navOpen]);

  return (
    <div className="jw-adminLoggedPage">
      <AffiliateHeader
        userName={firstName}
        onMenu={() => setNavOpen(true)}
        onCloseMenu={() => setNavOpen(false)}
        isMenuOpen={navOpen}
      />
      <div className="jw-adminLoggedGrid">
        <aside className="jw-adminLoggedNav" aria-label="Affiliate navigation">
          <div className="jw-adminLoggedNavInner">
            <AffiliateLeftNav
              variant="sidebar"
              openGroup={openGroup}
              setOpenGroup={setOpenGroup}
              activePath={location.pathname}
              onNavigate={(path) => navigate(path)}
            />
          </div>
        </aside>
        <main className="jw-adminLoggedBody">{children}</main>
      </div>
      <AffiliateLeftNav
        variant="drawer"
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        openGroup={openGroup}
        setOpenGroup={setOpenGroup}
        activePath={location.pathname}
        onNavigate={(path) => {
          navigate(path);
          setNavOpen(false);
        }}
      />
    </div>
  );
}

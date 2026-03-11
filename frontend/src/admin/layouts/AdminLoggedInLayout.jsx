import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminHeader from "../components/AdminHeader";
import AdminLeftNav from "../components/AdminLeftNav";
import { adminNavGroups, findAdminItemByPath } from "../adminNav";
import "./adminLoggedInLayout.css";

export default function AdminLoggedInLayout({ children }) {
  const [navOpen, setNavOpen] = useState(false); // mobile drawer
  const [openGroup, setOpenGroup] = useState(""); // only one dropdown open
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartRef = useRef(null);

  const role = localStorage.getItem("role") || "";
  const fullName = (localStorage.getItem("jw:fullName") || "").trim();
  const username = (localStorage.getItem("jw:username") || "").trim();
  const firstName = fullName.split(" ").filter(Boolean)[0] || username || "Admin";

  const activeItem = useMemo(
    () => findAdminItemByPath(location.pathname),
    [location.pathname],
  );

  const activeGroupName = useMemo(() => {
    if (!activeItem) return "";
    for (const g of adminNavGroups) {
      if (g.items.some((it) => it.path === activeItem.path)) return g.group;
    }
    return "";
  }, [activeItem]);

  // ✅ auto-expand dropdown group for current page
  useEffect(() => {
    if (activeGroupName) setOpenGroup(activeGroupName);
  }, [activeGroupName]);

  // ✅ close drawer when route changes
  useEffect(() => {
    if (navOpen) setNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ✅ If admin layout is mounted but role isn't admin, send to login (extra safety)
  useEffect(() => {
    if (role && role !== "admin") navigate("/login", { replace: true });
  }, [role, navigate]);

  const isMobile = () =>
    window.matchMedia && window.matchMedia("(max-width: 768px)").matches;

  // ✅ swipe gesture like client: edge swipe right to open, swipe left to close
  useEffect(() => {
    const onTouchStart = (ev) => {
      if (!isMobile()) return;
      if (!ev.touches || ev.touches.length !== 1) return;

      const t = ev.touches[0];
      const startX = t.clientX;
      const startY = t.clientY;

      const tag =
        ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        tag === "button"
      )
        return;

      touchStartRef.current = {
        x: startX,
        y: startY,
        fromEdge: startX <= 24,
      };
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

      // OPEN
      if (!navOpen && start.fromEdge && dx > 70) {
        setNavOpen(true);
        return;
      }

      // CLOSE
      if (navOpen && dx < -70) {
        setNavOpen(false);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [navOpen]);

  // ✅ show scrollbar while scrolling (desktop)
  useEffect(() => {
    const bodyEl = document.querySelector(".jw-adminLoggedBody");
    const navEl = document.querySelector(".jw-adminLoggedNav");

    let tBody = null;
    let tNav = null;

    const onBodyScroll = () => {
      if (!bodyEl) return;
      bodyEl.classList.add("jw-adminScrolling");
      window.clearTimeout(tBody);
      tBody = window.setTimeout(() => {
        bodyEl.classList.remove("jw-adminScrolling");
      }, 700);
    };

    const onNavScroll = () => {
      if (!navEl) return;
      navEl.classList.add("jw-adminScrolling");
      window.clearTimeout(tNav);
      tNav = window.setTimeout(() => {
        navEl.classList.remove("jw-adminScrolling");
      }, 700);
    };

    bodyEl?.addEventListener("scroll", onBodyScroll, { passive: true });
    navEl?.addEventListener("scroll", onNavScroll, { passive: true });

    return () => {
      bodyEl?.removeEventListener("scroll", onBodyScroll);
      navEl?.removeEventListener("scroll", onNavScroll);
      window.clearTimeout(tBody);
      window.clearTimeout(tNav);
    };
  }, []);

  const goPath = (path) => navigate(path);

  return (
    <div className="jw-adminLoggedPage">
      {/* Fixed Header */}
      <AdminHeader
        userName={firstName}
        onMenu={() => setNavOpen(true)}
        onCloseMenu={() => setNavOpen(false)}
        isMenuOpen={navOpen}
      />

      {/* Desktop grid (fixed below header) */}
      <div className="jw-adminLoggedGrid">
        {/* Desktop LeftNav */}
        <aside className="jw-adminLoggedNav" aria-label="Admin left navigation">
          <div className="jw-adminLoggedNavInner">
            <AdminLeftNav
              variant="sidebar"
              openGroup={openGroup}
              setOpenGroup={setOpenGroup}
              activePath={location.pathname}
              onNavigate={(path) => goPath(path)}
            />
          </div>
        </aside>

        {/* Body (scrollable) */}
        <main className="jw-adminLoggedBody">{children}</main>
      </div>

      {/* Mobile Drawer */}
      <AdminLeftNav
        variant="drawer"
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        openGroup={openGroup}
        setOpenGroup={setOpenGroup}
        activePath={location.pathname}
        onNavigate={(path) => {
          goPath(path);
          setNavOpen(false);
        }}
      />
    </div>
  );
}
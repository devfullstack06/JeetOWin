import React from "react";
import { adminNavGroups } from "../adminNav";
import "./adminLeftNav.css";

export default function AdminLeftNav({
  variant = "sidebar", // "sidebar" | "drawer"
  isOpen = false,
  onClose,
  openGroup,
  setOpenGroup,
  activePath,
  onNavigate,
}) {
  const isDrawer = variant === "drawer";

  const toggleGroup = (groupName) => {
    setOpenGroup((prev) => (prev === groupName ? "" : groupName));
  };

  const nav = (
    <div className={"jw-adminNav" + (isDrawer ? " jw-adminNavDrawer" : "")}>
      <div className="jw-adminNavGroups">
        {adminNavGroups.map((g) => {
          const expanded = openGroup === g.group;

          return (
            <div className="jw-adminNavGroup" key={g.group}>
              <button
                type="button"
                className={"jw-adminNavGroupBtn" + (expanded ? " jw-adminNavGroupBtnOpen" : "")}
                onClick={() => toggleGroup(g.group)}
                aria-expanded={expanded}
              >
                <span className="jw-adminNavGroupLabel">{g.group}:</span>
                <span className="jw-adminNavGroupCaret">{expanded ? "▾" : "▸"}</span>
              </button>

              <div className={"jw-adminNavItems" + (expanded ? " jw-adminNavItemsOpen" : "")}>
                {g.items.map((it) => {
                  const active = activePath === it.path;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={"jw-adminNavItem" + (active ? " jw-adminNavItemActive" : "")}
                      onClick={() => onNavigate(it.path)}
                      title={it.label}
                    >
                      {it.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Sidebar: always visible on desktop
  if (!isDrawer) return nav;

  // Drawer: overlay + slide in
  return (
    <div className={"jw-adminDrawerWrap" + (isOpen ? " jw-adminDrawerOpen" : "")} aria-hidden={!isOpen}>
      <button
        type="button"
        className="jw-adminDrawerBackdrop"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <div className="jw-adminDrawerPanel">
        {nav}
      </div>
    </div>
  );
}
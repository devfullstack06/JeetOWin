import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { adminNavGroups } from "../adminNav";

export default function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="jw-adminSidebar">
      <nav className="jw-adminNav">
        {adminNavGroups.map((group) => (
          <div className="jw-adminNavGroup" key={group.group}>
            <div className="jw-adminNavGroupLabel">{group.group}:</div>

            <div className="jw-adminNavItems">
              {group.items.map((item) => {
                const isActiveExact = pathname === item.path;

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={() =>
                      "jw-adminNavItem" + (isActiveExact ? " jw-adminNavItemActive" : "")
                    }
                    title={item.label}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
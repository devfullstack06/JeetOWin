// import React from "react";
// import { Outlet, useLocation } from "react-router-dom";
// import AdminSidebar from "./components/AdminSidebar";
// import AdminTopBar from "./components/AdminTopBar";
// import "./AdminLayout.css";
// import { findAdminItemByPath } from "./adminNav";

// export default function AdminLayout() {
//   const { pathname } = useLocation();
//   const active = findAdminItemByPath(pathname);

//   return (
//     <div className="jw-adminApp">
//       <AdminSidebar />

//       <div className="jw-adminMain">
//         <AdminTopBar />

//         <div className="jw-adminContent">
//           {/* Optional breadcrumb strip (keeps it close to your screenshot style) */}
//           <div className="jw-adminBread">
//             {active?.crumb || "Admin"}
//           </div>

//           <Outlet />
//         </div>
//       </div>
//     </div>
//   );
// }

import React from "react";
import { Outlet } from "react-router-dom";
import AdminLoggedInLayout from "./layouts/AdminLoggedInLayout";

export default function AdminLayout() {
  return (
    <AdminLoggedInLayout>
      <Outlet />
    </AdminLoggedInLayout>
  );
}
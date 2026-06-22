import { TopNavbar } from "./TopNavbar";
import { Outlet, useLocation } from "react-router-dom";

export function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNavbar />
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

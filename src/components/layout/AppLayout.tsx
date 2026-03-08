import { TopNavbar } from "./TopNavbar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNavbar />
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

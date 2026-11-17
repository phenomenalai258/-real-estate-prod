"use client";
import Navbar from "@/components/Navbar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
export default function Layout({ children }: { children: React.ReactNode }) {
  // Public browsing must not wait for a signed-in user.
  return <div className="h-full w-full"><Navbar /><main className="h-full flex w-full flex-col" style={{paddingTop:NAVBAR_HEIGHT}}>{children}</main></div>;
}

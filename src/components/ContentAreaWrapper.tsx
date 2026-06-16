"use client";

import React from "react";
import { usePathname } from "next/navigation";

const lightPrefixes = [
  "/dashboard",
  "/attendance",
  "/leaderboard",
  "/employee",
  "/manager",
  "/hotel",
  "/reports",
  "/work",
  "/learning",
  "/tasks",
  "/analytics",
];

export default function ContentAreaWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const shouldApply = lightPrefixes.some((p) => pathname.startsWith(p));

  if (shouldApply) return <div className="content-area">{children}</div>;
  return <>{children}</>;
}

"use client";

import ProtectedRoute from "@/components/Auth/ProtectedRoute";

export default function StatsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}

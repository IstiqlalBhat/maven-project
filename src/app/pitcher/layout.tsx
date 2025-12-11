"use client";

import ProtectedRoute from "@/components/Auth/ProtectedRoute";

export default function PitcherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}

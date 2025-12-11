"use client";

import ProtectedRoute from "@/components/Auth/ProtectedRoute";

export default function CompareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}

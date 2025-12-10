"use client";

import ProtectedRoute from "@/components/Auth/ProtectedRoute";

export default function CreateProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}

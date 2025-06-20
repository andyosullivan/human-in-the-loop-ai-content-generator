import React from "react";
import ReviewPage from "./ReviewPage";
import AdminLoginPage from "./AdminLoginPage";
import { AdminAuthProvider, useAuth } from "./AdminAuthContext";

// Simple guard for admin pages
function AdminGuard({ children }: { children: React.ReactNode }) {
    // CHANGE IS HERE
    const { jwt, logout } = useAuth();
    if (!jwt) return <AdminLoginPage />;
    return (
        <div>
            <div style={{ textAlign: "right", margin: 10 }}>
                <button
                    onClick={logout}
                    style={{
                        background: "crimson",
                        color: "#fff",
                        borderRadius: 6,
                        border: "none",
                        padding: "4px 14px"
                    }}
                >
                    Logout
                </button>
            </div>
            {children}
        </div>
    );
}

export default function App() {
    return (
        <AdminAuthProvider>
            <AdminGuard>
                <ReviewPage />
            </AdminGuard>
        </AdminAuthProvider>
    );
}
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ReviewPage from "./ReviewPage";
import Analytics from "./Analytics";
import AdminLoginPage from "./AdminLoginPage";
import { AdminAuthProvider, useAuth } from "./AdminAuthContext";

function AdminGuard({ children }: { children: React.ReactNode }) {
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
            {/* Add a navbar */}
            <nav style={{ marginBottom: 16 }}>
                <Link to="/" style={{ marginRight: 16 }}>Review</Link>
                <Link to="/analytics">Analytics</Link>
            </nav>
            {children}
        </div>
    );
}

export default function App() {
    return (
        <AdminAuthProvider>
            <BrowserRouter>
                <AdminGuard>
                    <Routes>
                        <Route path="/" element={<ReviewPage />} />
                        <Route path="/analytics" element={<Analytics />} />
                    </Routes>
                </AdminGuard>
            </BrowserRouter>
        </AdminAuthProvider>
    );
}
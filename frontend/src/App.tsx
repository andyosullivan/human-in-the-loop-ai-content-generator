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
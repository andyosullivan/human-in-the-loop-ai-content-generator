import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReviewPage from "./ReviewPage";
import Analytics from "./Analytics";
import AdminLoginPage from "./AdminLoginPage";
import { AdminAuthProvider, useAuth } from "./AdminAuthContext";
import PromptConfigPage from "./PromptConfigPage";

function AdminGuard({ children }: { children: React.ReactNode }) {
    const { jwt } = useAuth();
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
                        <Route path="/prompt-config" element={<PromptConfigPage />} />
                    </Routes>
                </AdminGuard>
            </BrowserRouter>
        </AdminAuthProvider>
    );
}
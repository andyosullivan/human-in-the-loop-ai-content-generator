import React, { useState } from "react";
import { useAuth } from "./AdminAuthContext";
import heroImage from "./assets/images/heroimage.png"; // adjust the path if needed

export default function AdminLoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [stage, setStage] = useState<"login" | "newpw">("login");
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            await login(email, password, stage === "newpw" ? newPassword : undefined);
            // success - redirect if needed
        } catch (e: any) {
            if (e?.code === "NEW_PASSWORD_REQUIRED") {
                setStage("newpw");
            } else {
                setErr(e?.message || "Login failed");
            }
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 360, margin: "100px auto", padding: 32, border: "1px solid #eee", borderRadius: 12 }}>
            {/* Hero image added here */}
            <img
                src={heroImage}
                alt="Hero"
                style={{ display: "block", width: "100%", maxHeight: 220, objectFit: "contain", marginBottom: 24 }}
            />
            <h2>Admin Login</h2>
            <form onSubmit={onSubmit}>
                <input
                    type="email"
                    value={email}
                    placeholder="Email"
                    required
                    autoFocus
                    style={{ width: "100%", marginBottom: 12, padding: 8 }}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading || stage === "newpw"}
                /><br />
                <input
                    type="password"
                    value={password}
                    placeholder="Password"
                    required
                    style={{ width: "100%", marginBottom: 12, padding: 8 }}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || stage === "newpw"}
                /><br />
                {stage === "newpw" && (
                    <input
                        type="password"
                        value={newPassword}
                        placeholder="New Password"
                        required
                        style={{ width: "100%", marginBottom: 12, padding: 8 }}
                        onChange={e => setNewPassword(e.target.value)}
                        disabled={loading}
                    />
                )}
                <button type="submit" disabled={loading || (stage === "newpw" && !newPassword)} style={{ marginLeft: 10, width: "100%", padding: 8 }}>
                    {loading ? (stage === "newpw" ? "Updating…" : "Logging in…") : (stage === "newpw" ? "Set New Password" : "Log In")}
                </button>
            </form>
            {err && <div style={{ color: "crimson", marginTop: 12 }}>{err}</div>}
        </div>
    );
}
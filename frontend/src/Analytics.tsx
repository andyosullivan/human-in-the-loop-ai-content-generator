import React, { useEffect, useState } from "react";
import { useAuth } from "./AdminAuthContext";
import {Link} from "react-router-dom";

const API_URL = "https://4yesf45xn7.execute-api.eu-west-1.amazonaws.com/prod/analytics";

type AnalyticsEvent = {
    pk: string;
    sk: string;
    eventType: string;
    gameType: string;
    ts: string;
    meta?: string;
};

export default function Analytics() {
    const [data, setData] = useState<AnalyticsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // jwt
    const { jwt, logout } = useAuth();

    useEffect(() => {
        setLoading(true);
        fetch(API_URL, {
            headers: { Authorization: `Bearer ${jwt}` }
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch analytics");
                return res.json();
            })
            .then(setData)
            .catch((err) => setError(err.message || "Error"))
            .finally(() => setLoading(false));
    }, [jwt]);

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7f8fa", minHeight: "100vh" }}>
            {/* NAVBAR */}
            <nav style={{
                background: "#fff",
                boxShadow: "0 2px 8px #0001",
                padding: "16px 0",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: "flex", alignItems: "center", marginLeft: 32 }}>
                    <span style={{
                        fontWeight: 700, fontSize: 22,
                        color: "#4f7cff", letterSpacing: 1
                    }}>New Game Please!</span>
                    <Link to="/" style={{
                        marginLeft: 32, color: "#888", fontWeight: 500, textDecoration: "none"
                    }}>Review</Link>
                    <Link to="/analytics" style={{
                        marginLeft: 24, color: "#888", fontWeight: 500, textDecoration: "none"
                    }}>Analytics</Link>
                </div>
                <button
                    onClick={logout}
                    style={{
                        marginRight: 32,
                        background: "linear-gradient(90deg,#e52e71,#ff6a00)",
                        color: "#fff", border: "none", borderRadius: 24,
                        fontWeight: 700, fontSize: 16, padding: "7px 26px",
                        cursor: "pointer", boxShadow: "0 2px 6px #e52e7130"
                    }}>
                    Logout
                </button>
            </nav>

            <div style={{ maxWidth: 960, margin: "2rem auto" }}>
                <h2 style={{
                    fontWeight: 800, marginBottom: 24, color: "#2b2d42",
                    fontSize: 28, letterSpacing: -1
                }}>
                    Analytics Dashboard
                </h2>
                <div style={{
                    background: "#fff",
                    borderRadius: 18,
                    boxShadow: "0 2px 8px #0001",
                    padding: "32px 24px",
                    marginBottom: 40,
                }}>
                    {loading && <div>Loading analytics...</div>}
                    {error && <div style={{ color: "crimson" }}>{error}</div>}
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: 8,
                        fontSize: 15,
                        background: "#fff",
                        borderRadius: 12,
                        overflow: "hidden"
                    }}>
                        <thead>
                        <tr style={{ background: "#f5f6fa" }}>
                            <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>Timestamp</th>
                            <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>Event Type</th>
                            <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>Game Type</th>
                            <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>Meta</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: "center", padding: 20, color: "#aaa" }}>
                                    No analytics yet!
                                </td>
                            </tr>
                        )}
                        {data.map((row, i) => (
                            <tr key={row.sk || i} style={{ background: i % 2 === 0 ? "#fff" : "#f5f6fa" }}>
                                <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                                    {new Date(row.ts).toLocaleString()}
                                </td>
                                <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                                    {row.eventType}
                                </td>
                                <td style={{ padding: 10, borderBottom: "1px solid #f3f3f3" }}>
                                    {row.gameType}
                                </td>
                                <td style={{
                                    padding: 10,
                                    borderBottom: "1px solid #f3f3f3",
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                    color: "#888",
                                    maxWidth: 320,
                                    overflowWrap: "break-word"
                                }}>
                                    {row.meta ? row.meta : ""}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

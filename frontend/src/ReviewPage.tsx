import React, { useEffect, useState } from "react";
import SpecPreview from "./SpecPreview";
import { useAuth } from "./AdminAuthContext";
import { Link } from "react-router-dom";

const API_BASE = "https://4yesf45xn7.execute-api.eu-west-1.amazonaws.com/prod";

// Types
type Status = "PENDING" | "APPROVED" | "REJECTED";
type ItemTypeStats = { PENDING?: number; APPROVED?: number; REJECTED?: number; TOTAL?: number };
type ByType = Record<string, ItemTypeStats>;
type Item = {
    itemId: string;
    version: number;
    type: string;
    status: Status;
    lang: string;
    createdAt: string;
    spec: any;
};

export default function ReviewPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestCount, setRequestCount] = useState(10);
    const [requesting, setRequesting] = useState(false);

    const [stats, setStats] = useState<{ total: number; byType: ByType }>({ total: 0, byType: {} });
    const [loadingStats, setLoadingStats] = useState(false);
    const [errorStats, setErrorStats] = useState<string | null>(null);

    const { jwt, logout } = useAuth();

    // Fetch Pending Items
    const fetchPending = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(jwt ? { "Authorization": jwt } : {})
            };
            const res = await fetch(`${API_BASE}/pending`, { headers });
            if (!res.ok) throw new Error("Failed to fetch pending items");
            const data = await res.json();
            setItems(data.items);
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    // Fetch Stats
    const fetchStats = async () => {
        setLoadingStats(true);
        setErrorStats(null);
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(jwt ? { "Authorization": jwt } : {})
            };
            const res = await fetch(`${API_BASE}/item-stats`, { headers });
            if (!res.ok) throw new Error("Failed to fetch stats");
            const data = await res.json();
            setStats({
                total: data.total,
                byType: data.byType
            });
        } catch (e: any) {
            setErrorStats(e.message || "Unknown error");
        }
        setLoadingStats(false);
    };

    // Request New Items
    const handleRequestItems = async () => {
        setRequesting(true);
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(jwt ? { "Authorization": jwt } : {})
            };
            const res = await fetch(`${API_BASE}/request-items`, {
                method: "POST",
                headers,
                body: JSON.stringify({ count: requestCount, lang: "en" })
            });
            const data = await res.json();
            alert("Request submitted! StepFunction execution started: " + data.executionArn);
            fetchStats();
        } catch (e) {
            alert("Failed to request items: " + e);
        }
        setRequesting(false);
    };

    // Approve/Reject
    const handleReview = async (itemId: string, version: number, status: Status) => {
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(jwt ? { "Authorization": jwt } : {})
            };
            await fetch(`${API_BASE}/review`, {
                method: "POST",
                headers,
                body: JSON.stringify({ itemId, version, status, reviewer: "fiadh" })
            });
            setItems(items => items.filter(item => !(item.itemId === itemId && item.version === version)));
            fetchStats();
        } catch (e) {
            alert("Review failed: " + e);
        }
    };

    const handleRefresh = () => {
        fetchPending();
        fetchStats();
    };

    useEffect(() => {
        fetchPending();
        fetchStats();
        // eslint-disable-next-line
    }, []);

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
                    <Link to="/prompt-config" style={{
                        marginLeft: 24, color: "#888", fontWeight: 500, textDecoration: "none"
                    }}>Prompt-Config</Link>
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
                {/* ACTIONS */}
                <section style={{
                    display: "flex", alignItems: "center", gap: 16, marginBottom: 36,
                    flexWrap: "wrap", background: "#fff", borderRadius: 18, boxShadow: "0 2px 8px #0002",
                    padding: 24
                }}>
                    <label style={{ fontWeight: 500 }}>
                        How many new items?
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={requestCount}
                            disabled={requesting}
                            onChange={e => setRequestCount(Number(e.target.value))}
                            style={{
                                width: 60, marginLeft: 10, borderRadius: 8,
                                border: "1px solid #dbe1ec", padding: "5px 12px",
                                fontSize: 16
                            }}
                        />
                    </label>
                    <button onClick={handleRequestItems} disabled={requesting || requestCount < 1}
                            style={{
                                background: "linear-gradient(90deg,#4f7cff,#68e0cf)",
                                color: "#fff", border: "none", borderRadius: 22,
                                fontWeight: 700, fontSize: 16, padding: "7px 22px",
                                boxShadow: "0 2px 8px #4f7cff20", marginLeft: 8,
                                cursor: requesting ? "not-allowed" : "pointer", opacity: requesting ? 0.6 : 1,
                                transition: "background .18s"
                            }}>
                        {requesting ? "Requesting…" : "Request New Items"}
                    </button>
                    <button style={{
                        background: "#fff",
                        color: "#4f7cff", border: "1.5px solid #4f7cff", borderRadius: 22,
                        fontWeight: 700, fontSize: 16, padding: "7px 22px",
                        boxShadow: "0 2px 8px #4f7cff10",
                        marginLeft: 8, cursor: "pointer", transition: "background .18s"
                    }} onClick={handleRefresh}>
                        Refresh List & Stats
                    </button>
                </section>

                {/* Stats Table */}
                <div style={{ margin: "32px 0 42px 0", background: "#fff", borderRadius: 18, boxShadow: "0 2px 8px #0001", padding: "32px 24px" }}>
                    <h3 style={{ marginBottom: 20, fontWeight: 700, fontSize: 20 }}>Database Stats</h3>
                    {loadingStats && <p>Loading stats…</p>}
                    {errorStats && <p style={{ color: "red" }}>{errorStats}</p>}
                    {!loadingStats && !errorStats && (
                        <table style={{
                            width: "100%", borderCollapse: "collapse", marginBottom: 24,
                            fontSize: 17, background: "#fff", borderRadius: 12, overflow: "hidden"
                        }}>
                            <thead style={{ background: "#f5f6fa" }}>
                            <tr>
                                <th style={{ textAlign: "left", padding: 10, borderBottom: "2px solid #e6e6f0" }}>Type</th>
                                <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>PENDING</th>
                                <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>APPROVED</th>
                                <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>REJECTED</th>
                                <th style={{ padding: 10, borderBottom: "2px solid #e6e6f0" }}>TOTAL</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr style={{ background: "#f9f9fb" }}>
                                <td style={{ fontWeight: "bold", padding: 10 }}>Total</td>
                                <td colSpan={3}></td>
                                <td style={{ padding: 10 }}>{stats.total}</td>
                            </tr>
                            {Object.entries(stats.byType).map(([type, st], idx) => (
                                <tr key={type} style={{ background: idx % 2 === 0 ? "#fff" : "#f5f6fa" }}>
                                    <td style={{ padding: 10 }}>{type}</td>
                                    <td style={{ padding: 10 }}>{st.PENDING || 0}</td>
                                    <td style={{ padding: 10 }}>{st.APPROVED || 0}</td>
                                    <td style={{ padding: 10 }}>{st.REJECTED || 0}</td>
                                    <td style={{ padding: 10 }}>{st.TOTAL || 0}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 style={{ fontWeight: 800, marginBottom: 24, color: "#2b2d42", fontSize: 28, letterSpacing: -1 }}>Pending Items for Review</h2>
                {loading && <p>Loading…</p>}
                {error && <p style={{ color: "crimson" }}>{error}</p>}
                {(!loading && items.length === 0) && <p>All caught up! <span role="img" aria-label="party">🎉</span></p>}
                {items.map(item => (
                    <div
                        key={item.itemId + "-" + item.version}
                        style={{
                            border: "1.5px solid #e6e6f0", borderRadius: 18,
                            background: "#fff", boxShadow: "0 2px 10px #0001",
                            padding: 22, margin: "1.6rem 0"
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 17, color: "#4f7cff" }}>
                                {item.type.replace(/_/g, " ").toUpperCase()}
                                <span style={{ fontWeight: 400, fontSize: 13, color: "#999", marginLeft: 18 }}>
                                    <code style={{ background: "#f5f6fa", borderRadius: 4, padding: "1px 6px" }}>{item.itemId}</code> • v{item.version} • {item.createdAt}
                                </span>
                            </span>
                            <span>
                                <button
                                    style={{
                                        marginRight: 12, color: "#fff",
                                        background: "linear-gradient(90deg,#68e0cf,#4f7cff)",
                                        border: "none", borderRadius: 16, padding: "7px 20px",
                                        fontWeight: 700, fontSize: 15, boxShadow: "0 1px 4px #4f7cff10",
                                        cursor: "pointer", transition: "background .15s"
                                    }}
                                    onClick={() => handleReview(item.itemId, item.version, "APPROVED")}>
                                    Approve
                                </button>
                                <button
                                    style={{
                                        color: "#fff",
                                        background: "linear-gradient(90deg,#e52e71,#ff6a00)",
                                        border: "none", borderRadius: 16, padding: "7px 20px",
                                        fontWeight: 700, fontSize: 15, boxShadow: "0 1px 4px #ff6a0020",
                                        cursor: "pointer", transition: "background .15s"
                                    }}
                                    onClick={() => handleReview(item.itemId, item.version, "REJECTED")}>
                                    Reject
                                </button>
                            </span>
                        </div>
                        <SpecPreview type={item.type} spec={item.spec} />
                        <details>
                            <summary style={{ fontSize: 14, marginTop: 6, color: "#888", cursor: "pointer" }}>
                                Raw spec (debug)
                            </summary>
                            <pre style={{
                                background: "#f9f9fb", borderRadius: 6, marginTop: 8, fontSize: 13, padding: 12, overflowX: "auto"
                            }}>
                                {JSON.stringify(item.spec, null, 2)}
                            </pre>
                        </details>
                    </div>
                ))}
            </div>
        </div>
    );
}

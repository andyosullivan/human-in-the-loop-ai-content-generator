import React, { useEffect, useState } from "react";
import SpecPreview from "./SpecPreview";
import { useAuth } from "./AdminAuthContext";

const API_BASE = "https://4yesf45xn7.execute-api.eu-west-1.amazonaws.com/prod";

// --- Types
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
    const [requestCount, setRequestCount] = useState(1);
    const [requesting, setRequesting] = useState(false);

    const [stats, setStats] = useState<{ total: number; byType: ByType }>({ total: 0, byType: {} });
    const [loadingStats, setLoadingStats] = useState(false);
    const [errorStats, setErrorStats] = useState<string | null>(null);

    // jwt
    const { jwt } = useAuth();

    // --- Fetch Pending Items
    const fetchPending = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(jwt ? { "Authorization": jwt } : {})
            };

            const res = await fetch(`${API_BASE}/pending`, {
                headers,
            });
            if (!res.ok) throw new Error("Failed to fetch pending items");
            const data = await res.json();
            setItems(data.items);
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };


    // --- Fetch Item Stats
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


    // --- Request New Items
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
            fetchStats(); // Update stats after requesting new items
        } catch (e) {
            alert("Failed to request items: " + e);
        }
        setRequesting(false);
    };


    // --- Approve/Reject
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
            // Refresh list after review
            setItems(items => items.filter(item => !(item.itemId === itemId && item.version === version)));
            fetchStats(); // Update stats after reviewing
        } catch (e) {
            alert("Review failed: " + e);
        }
    };


    // --- Manual Refresh Handler
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
        <div style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "system-ui" }}>
            <div style={{ marginBottom: 32 }}>
                <label>
                    How many new items?&nbsp;
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={requestCount}
                        disabled={requesting}
                        onChange={e => setRequestCount(Number(e.target.value))}
                        style={{ width: 60, marginRight: 12 }}
                    />
                </label>
                <button onClick={handleRequestItems} disabled={requesting || requestCount < 1}>
                    {requesting ? "Requesting…" : "Request New Items"}
                </button>
                <button style={{ marginLeft: 16 }} onClick={handleRefresh}>
                    Refresh List & Stats
                </button>
            </div>

            {/* Stats Table */}
            <div style={{ margin: "24px 0" }}>
                <h3>Database Stats</h3>
                {loadingStats && <p>Loading stats…</p>}
                {errorStats && <p style={{ color: "red" }}>{errorStats}</p>}
                {!loadingStats && !errorStats && (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "2px solid #eee" }}>Type</th>
                            <th style={{ padding: 8, borderBottom: "2px solid #eee" }}>PENDING</th>
                            <th style={{ padding: 8, borderBottom: "2px solid #eee" }}>APPROVED</th>
                            <th style={{ padding: 8, borderBottom: "2px solid #eee" }}>REJECTED</th>
                            <th style={{ padding: 8, borderBottom: "2px solid #eee" }}>TOTAL</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td style={{ fontWeight: "bold", padding: 8 }}>Total</td>
                            <td colSpan={3}></td>
                            <td style={{ padding: 8 }}>{stats.total}</td>
                        </tr>
                        {Object.entries(stats.byType).map(([type, st]) => (
                            <tr key={type}>
                                <td style={{ padding: 8 }}>{type}</td>
                                <td style={{ padding: 8 }}>{st.PENDING || 0}</td>
                                <td style={{ padding: 8 }}>{st.APPROVED || 0}</td>
                                <td style={{ padding: 8 }}>{st.REJECTED || 0}</td>
                                <td style={{ padding: 8 }}>{st.TOTAL || 0}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            <h2>Pending Items for Review</h2>
            {loading && <p>Loading…</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {(!loading && items.length === 0) && <p>All caught up! 🎉</p>}
            {items.map(item => (
                <div key={item.itemId + "-" + item.version} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, margin: "1rem 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>
                            <b>{item.type}</b> • <code>{item.itemId}</code> • v{item.version} <span style={{ color: "#888" }}>{item.createdAt}</span>
                        </span>
                        <span>
                            <button style={{ marginRight: 8, color: "#fff", background: "green", border: "none", borderRadius: 4, padding: "4px 12px" }}
                                    onClick={() => handleReview(item.itemId, item.version, "APPROVED")}>
                                Approve
                            </button>
                            <button style={{ color: "#fff", background: "crimson", border: "none", borderRadius: 4, padding: "4px 12px" }}
                                    onClick={() => handleReview(item.itemId, item.version, "REJECTED")}>
                                Reject
                            </button>
                        </span>
                    </div>
                    <SpecPreview type={item.type} spec={item.spec} />
                    <details>
                        <summary>Raw spec (debug)</summary>
                        <pre style={{ background: "#f9f9f9", borderRadius: 4, marginTop: 12, fontSize: 13, padding: 10, overflowX: "auto" }}>
                            {JSON.stringify(item.spec, null, 2)}
                        </pre>
                    </details>
                </div>
            ))}
        </div>
    );
}
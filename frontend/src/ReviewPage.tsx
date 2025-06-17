import React, { useEffect, useState } from "react";
import SpecPreview from "./SpecPreview";

const API_BASE = "https://4yesf45xn7.execute-api.eu-west-1.amazonaws.com/prod";

type Item = {
    itemId: string;
    version: number;
    type: string;
    status: string;
    lang: string;
    createdAt: string;
    spec: any;
};

type ItemStats = {
    total: number;
    byType: Record<string, number>;
};

export default function ReviewPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestCount, setRequestCount] = useState(1);
    const [requesting, setRequesting] = useState(false);
    const [stats, setStats] = useState<ItemStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const handleRequestItems = async () => {
        setRequesting(true);
        try {
            const res = await fetch(`${API_BASE}/request-items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: requestCount, lang: "en" })
            });
            const data = await res.json();
            alert("Request submitted! StepFunction execution started: " + data.executionArn);
        } catch (e) {
            alert("Failed to request items: " + e);
        }
        setRequesting(false);
    };

    const fetchPending = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/pending`);
            if (!res.ok) throw new Error("Failed to fetch pending items");
            const data = await res.json();
            setItems(data.items);
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/item-stats`);
            if (!res.ok) throw new Error("Failed to fetch item stats");
            const data = await res.json();
            setStats(data);
        } catch (e: any) {
            // Optionally handle stats error
        }
        setStatsLoading(false);
    };

    useEffect(() => {
        fetchPending();
        fetchStats();
    }, []);

    const handleRefresh = () => {
        fetchPending();
        fetchStats();
    };

    const handleReview = async (itemId: string, version: number, status: "APPROVED" | "REJECTED") => {
        try {
            await fetch(`${API_BASE}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, version, status, reviewer: "fiadh" })
            });
            setItems(items => items.filter(item => !(item.itemId === itemId && item.version === version)));
            fetchStats(); // update stats after review
        } catch (e) {
            alert("Review failed: " + e);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "system-ui" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
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
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || statsLoading}
                    style={{
                        padding: "6px 14px", background: "#2c3e50", color: "#fff", border: "none",
                        borderRadius: 5, fontWeight: "bold", cursor: "pointer", minWidth: 90
                    }}>
                    {loading || statsLoading ? "Refreshing…" : "Refresh"}
                </button>
            </div>

            {stats && (
                <table style={{ margin: "1rem 0", borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                    <tr>
                        <th style={{ border: "1px solid #ddd", padding: 8 }}>Type</th>
                        <th style={{ border: "1px solid #ddd", padding: 8 }}>Count</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td style={{ border: "1px solid #ddd", padding: 8 }}><b>Total</b></td>
                        <td style={{ border: "1px solid #ddd", padding: 8 }}>{stats.total}</td>
                    </tr>
                    {Object.entries(stats.byType).map(([type, count]) => (
                        <tr key={type}>
                            <td style={{ border: "1px solid #ddd", padding: 8 }}>{type}</td>
                            <td style={{ border: "1px solid #ddd", padding: 8 }}>{count}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

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

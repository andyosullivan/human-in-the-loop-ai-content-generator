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

export default function ReviewPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestCount, setRequestCount] = useState(1);
    const [requesting, setRequesting] = useState(false);

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

    useEffect(() => {
        fetchPending();
    }, []);

    const handleReview = async (itemId: string, version: number, status: "APPROVED" | "REJECTED") => {
        try {
            await fetch(`${API_BASE}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, version, status, reviewer: "fiadh" })
            });
            // Refresh list after review
            setItems(items => items.filter(item => !(item.itemId === itemId && item.version === version)));
        } catch (e) {
            alert("Review failed: " + e);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "system-ui" }}>
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

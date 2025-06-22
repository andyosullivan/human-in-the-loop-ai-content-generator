import React, { useEffect, useState } from "react";
import { useAuth } from "./AdminAuthContext";

// Update to your real endpoint:
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
    const { jwt } = useAuth();

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
        <div style={{ maxWidth: 900, margin: "32px auto", padding: 24 }}>
            <h2>Analytics Dashboard</h2>
            {loading && <div>Loading analytics...</div>}
            {error && <div style={{ color: "crimson" }}>{error}</div>}
            <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 16,
                fontSize: 15,
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 12px #0001",
                overflow: "hidden"
            }}>
                <thead>
                <tr style={{ background: "#f6f8fa" }}>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Timestamp</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Event Type</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Game Type</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Meta</th>
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
                    <tr key={row.sk || i}>
                        <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                            {new Date(row.ts).toLocaleString()}
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                            {row.eventType}
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                            {row.gameType}
                        </td>
                        <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", fontFamily: "monospace", fontSize: 13, color: "#888" }}>
                            {row.meta ? row.meta : ""}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

import React, { useEffect, useState } from "react";
import { useAuth } from "./AdminAuthContext";
import {Link} from "react-router-dom";

// Endpoint
const API_BASE = "https://4yesf45xn7.execute-api.eu-west-1.amazonaws.com/prod/prompt-config";

export default function PromptConfigPage() {
    const { jwt } = useAuth();
    const [prompt, setPrompt] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load current prompt
    useEffect(() => {
        setLoading(true);
        setStatus(null);
        setError(null);
        fetch(API_BASE, {
            headers: {
                Authorization: jwt ? jwt : "",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch prompt");
                return res.json();
            })
            .then((data) => {
                setPrompt(data.prompt || "");
            })
            .catch((err) => setError(err.message || "Unknown error"))
            .finally(() => setLoading(false));
    }, [jwt]);

    // Save prompt to API
    const handleSave = async () => {
        setSaving(true);
        setStatus(null);
        setError(null);
        try {
            const res = await fetch(API_BASE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: jwt ? jwt : "",
                },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save prompt");
            }
            setStatus("Saved! 🎉");
        } catch (e: any) {
            setError(e.message || "Failed to save");
        }
        setSaving(false);
    };

    return (
        <div style={{
            maxWidth: 900,
            margin: "32px auto",
            padding: 32,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 2px 12px #0002",
        }}>
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
            </nav>
            <h2 style={{ fontWeight: 700, marginBottom: 16 }}>Edit Bedrock Prompt Config</h2>

            {loading && <div style={{ marginBottom: 12 }}>Loading current prompt…</div>}
            {error && <div style={{ color: "crimson", marginBottom: 14 }}>{error}</div>}
            {status && <div style={{ color: "green", marginBottom: 14 }}>{status}</div>}

            <label style={{ display: "block", marginBottom: 12, fontWeight: 500 }}>
                Prompt (used for AI game generation):
            </label>
            <textarea
                style={{
                    width: "100%",
                    minHeight: 320,
                    fontFamily: "Fira Mono, Menlo, monospace",
                    fontSize: 15,
                    padding: 16,
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    background: "#f8f9fa",
                    marginBottom: 16,
                    resize: "vertical"
                }}
                value={prompt}
                disabled={loading || saving}
                onChange={e => setPrompt(e.target.value)}
            />

            <div>
                <button
                    style={{
                        background: "#4f7cff",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 24px",
                        fontSize: 17,
                        marginRight: 10,
                        cursor: loading || saving ? "not-allowed" : "pointer"
                    }}
                    onClick={handleSave}
                    disabled={loading || saving}
                >
                    {saving ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}

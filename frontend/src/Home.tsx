// src/Home.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div style={{ maxWidth: 600, margin: "4rem auto", textAlign: "center" }}>
            <h1>Welcome to the Human-in-the-Loop Content Review!</h1>
            <p>
                This app lets you review, approve, and reject AI-generated interactive content.
            </p>
            <Link to="/review">
                <button
                    style={{
                        fontSize: "1.2rem",
                        padding: "0.7em 2em",
                        borderRadius: 8,
                        border: "none",
                        background: "#6246ea",
                        color: "#fff",
                        marginTop: 32,
                        cursor: "pointer"
                    }}
                >
                    Go to Review Page
                </button>
            </Link>
            <p style={{ marginTop: 40, color: "#888" }}>
                Made with 💜 for the AWS Lambda Hackathon
            </p>
        </div>
    );
}
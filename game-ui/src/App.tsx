import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import GamePage from "./GamePage";

function Home() {
  return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <h1>Welcome to the AI Game Playground 🎲</h1>
        <Link to="/game">
          <button style={{
            background: "#4f7cff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "16px 36px",
            fontSize: 22,
            cursor: "pointer",
            marginTop: 40
          }}>
            Play a Random Game!
          </button>
        </Link>
      </div>
  );
}

export default function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<GamePage />} />
        </Routes>
      </Router>
  );
}

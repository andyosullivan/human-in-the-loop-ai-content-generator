import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import ReviewPage from './ReviewPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/review" element={<ReviewPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

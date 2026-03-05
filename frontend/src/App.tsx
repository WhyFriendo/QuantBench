import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Benchmark from './pages/Benchmark';
import Results from './pages/Results';

function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 font-sans">
                QuantBench Evaluator
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl text-center">
                Analyze, compare, and visualize the performance of your quantized LLM models.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                <div className="bg-white rounded-2xl p-8 shadow-xl shadow-blue-500/5 border border-indigo-50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </div>
                    <h2 className="text-2xl font-semibold mb-3">Run Benchmark</h2>
                    <p className="text-gray-500 mb-6">Select a local GGUF model and tasks from lm_eval to start discovering performance metrics.</p>
                    <Link to="/benchmark" className="block text-center w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
                        Configure Run
                    </Link>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-xl shadow-indigo-500/5 border border-indigo-50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                    </div>
                    <h2 className="text-2xl font-semibold mb-3">View Results</h2>
                    <p className="text-gray-500 mb-6">Analyze past benchmark outputs with beautiful charts and visual performance comparisons.</p>
                    <Link to="/results" className="block text-center w-full py-3 px-4 bg-white border-2 border-indigo-100 hover:border-indigo-200 text-indigo-600 font-medium rounded-xl transition-colors">
                        Explore Metrics
                    </Link>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <div className="w-full min-h-screen bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900">
            <header className="w-full px-8 py-5 flex items-center justify-between border-b border-gray-200 bg-white shadow-sm/50">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">Q</div>
                    <span className="text-xl font-bold text-gray-900">QuantBench</span>
                </Link>
                <nav className="flex gap-6 text-sm font-medium text-gray-600">
                    <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
                    <Link to="/benchmark" className="hover:text-indigo-600 transition-colors">Run</Link>
                    <Link to="/results" className="hover:text-indigo-600 transition-colors">Results</Link>
                </nav>
            </header>

            <main className="container mx-auto max-w-7xl pb-12 pt-8">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/benchmark" element={<Benchmark />} />
                    <Route path="/results" element={<Results />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;

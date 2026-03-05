import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Title,
    Tooltip,
    Legend
);

type RunStatus = {
    id: string;
    model: string;
    tasks: string[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    created_at: string;
    completed_at?: string;
    error?: string;
    results?: any;
};

export default function Results() {
    const [runs, setRuns] = useState<RunStatus[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRuns = () => {
        fetch('http://127.0.0.1:8000/api/runs')
            .then(res => res.json())
            .then(data => {
                // Sort by newest first
                const sorted = data.sort((a: RunStatus, b: RunStatus) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setRuns(sorted);
            })
            .catch(err => console.error("Failed to fetch runs", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchRuns();
        // Poll every 5 seconds for updates
        const interval = setInterval(fetchRuns, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-center py-20 text-gray-500">Loading results...</div>;
    if (runs.length === 0) return <div className="text-center py-20 text-gray-500 max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100">No benchmarks run yet. Go to the Run tab to start one!</div>;

    return (
        <div className="space-y-8">
            {runs.map(run => (
                <RunResultCard key={run.id} run={run} />
            ))}
        </div>
    );
}

function RunResultCard({ run }: { run: RunStatus }) {
    const isComplete = run.status === 'completed';
    const hasResults = isComplete && run.results && run.results.results;

    // Extract metrics for chart
    let chartData = null;
    let radarData = null;

    if (hasResults) {
        const labels = Object.keys(run.results.results);
        const accuracyData = labels.map(task => {
            const taskResults = run.results.results[task];
            // LM eval accuracy keys vary. Try to extract common ones:
            return taskResults.acc || taskResults.acc_norm || taskResults.exact_match || taskResults.mc1 || 0;
        });

        chartData = {
            labels,
            datasets: [
                {
                    label: 'Accuracy Score',
                    data: accuracyData,
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderRadius: 6,
                }
            ]
        };

        radarData = {
            labels,
            datasets: [
                {
                    label: 'Capability Profile',
                    data: accuracyData,
                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    borderColor: 'rgba(56, 189, 248, 1)',
                    pointBackgroundColor: 'rgba(56, 189, 248, 1)',
                    borderWidth: 2,
                }
            ]
        };
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 1 } },
        plugins: {
            legend: { display: false }
        }
    };

    const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { beginAtZero: true, max: 1 } },
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                <div>
                    <h3 className="font-semibold text-gray-900 font-mono text-sm">{run.model.split('\\').pop()?.split('/').pop()}</h3>
                    <p className="text-xs text-gray-500 mt-1">{new Date(run.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={run.status} />
            </div>

            <div className="p-6">
                {run.status === 'running' && (
                    <div className="flex flex-col items-center justify-center py-12 text-blue-500">
                        <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-medium">Evaluation in progress...</span>
                    </div>
                )}

                {run.status === 'failed' && (
                    <div className="py-8 text-center text-red-500 bg-red-50 rounded-xl">
                        <p className="font-medium">Evaluation Failed</p>
                        <p className="text-sm mt-2 text-red-400 font-mono">{run.error}</p>
                    </div>
                )}

                {hasResults && chartData && radarData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-64">
                            <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Accuracy by Task</h4>
                            <Bar data={chartData} options={chartOptions} />
                        </div>
                        <div className="h-64 flex flex-col items-center">
                            <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider w-full text-left">Capabilities</h4>
                            <Radar data={radarData} options={radarOptions} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'running':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Running</span>;
        case 'completed':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Completed</span>;
        case 'failed':
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Failed</span>;
        default:
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"><span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>Pending</span>;
    }
}

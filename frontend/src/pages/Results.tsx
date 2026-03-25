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

function getQuantizationInfo(modelPath: string): { bits: string; type: string } | null {
    const filename = modelPath.split('\\').pop()?.split('/').pop()?.toLowerCase() || '';
    
    // Match GGUF quantization formats like Q4_K_M, Q8_0, q3_k_m, etc.
    const quantMatch = filename.match(/q(\d+(?:_\d+)?)[-_]?([a-z0-9_]*)/i);
    
    if (quantMatch) {
        const bits = quantMatch[1].replace('_', '.');
        const type = quantMatch[2] ? quantMatch[2].toUpperCase() : '';
        return { bits, type };
    }
    
    // Check for other common formats
    if (filename.includes('fp16')) return { bits: '16', type: 'FP16' };
    if (filename.includes('fp32')) return { bits: '32', type: 'FP32' };
    if (filename.includes('int8')) return { bits: '8', type: 'INT8' };
    
    return null;
}

function RunResultCard({ run }: { run: RunStatus }) {
    const isComplete = run.status === 'completed';
    const hasResults = isComplete && run.results && run.results.results;
    const quantInfo = getQuantizationInfo(run.model);

    // Extract metrics for chart
    let chartData = null;
    let radarData = null;
    let metricsTable: Array<{task: string, score: number, efficiency: number}> = [];

    if (hasResults) {
        const labels = Object.keys(run.results.results);
        const accuracyData = labels.map(task => {
            const taskResults = run.results.results[task];
            // LM eval keys have suffixes like ",none". Try multiple variations:
            const getMetric = (base: string) => {
                return taskResults[base] || 
                       taskResults[`${base},none`] || 
                       taskResults[`${base},flexible-extract`] || 0;
            };
            return getMetric('acc') || getMetric('acc_norm') || 
                   getMetric('exact_match') || getMetric('mc1') || getMetric('mc2') || 0;
        });

        // Calculate BPW normalized scores
        const bpw = quantInfo ? parseFloat(quantInfo.bits) : 16; // Default to 16 if unknown
        const normalizedData = accuracyData.map(score => {
            // Normalize: accuracy / (bits/16) to get efficiency relative to FP16
            // Higher is better - more accuracy per bit
            return (score * 16) / bpw;
        });

        metricsTable = labels.map((task, i) => ({
            task,
            score: accuracyData[i],
            efficiency: normalizedData[i]
        }));

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
                    label: 'Efficiency (Accuracy/BPW)',
                    data: normalizedData,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
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
        scales: {
            r: {
                beginAtZero: true,
                ticks: {
                    stepSize: 0.2
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        return `Efficiency: ${context.parsed.r.toFixed(3)}`;
                    }
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 font-mono text-sm">{run.model.split('\\').pop()?.split('/').pop()}</h3>
                        {quantInfo && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                {quantInfo.bits} bits{quantInfo.type && ` • ${quantInfo.type}`}
                            </span>
                        )}
                    </div>
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

                {hasResults && chartData && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                                <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Quantization</p>
                                <p className="text-lg font-bold text-purple-900 mt-1">
                                    {quantInfo ? `${quantInfo.bits} bits` : 'Unknown'}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Tasks</p>
                                <p className="text-lg font-bold text-blue-900 mt-1">{run.tasks.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Avg Score</p>
                                <p className="text-lg font-bold text-green-900 mt-1">
                                    {metricsTable.length > 0 
                                        ? `${((metricsTable.reduce((sum, m) => sum + m.score, 0) / metricsTable.length) * 100).toFixed(1)}%`
                                        : 'N/A'}
                                </p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Format</p>
                                <p className="text-lg font-bold text-amber-900 mt-1">
                                    {quantInfo?.type || 'GGUF'}
                                </p>
                            </div>
                        </div>
                        
                        <div className={`grid grid-cols-1 ${metricsTable.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                            <div className="h-64">
                                <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Accuracy by Task</h4>
                                <Bar data={chartData} options={chartOptions} />
                            </div>
                            {metricsTable.length >= 3 && radarData && (
                                <div className="h-64">
                                    <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">
                                        Efficiency (Normalized by BPW)
                                    </h4>
                                    <Radar data={radarData} options={radarOptions} />
                                </div>
                            )}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Task Scores</h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {metricsTable.map(({ task, score, efficiency }) => (
                                        <div key={task} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-sm text-gray-700">{task}</span>
                                                <span className="font-mono text-sm font-semibold text-indigo-600">
                                                    {(score * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Efficiency (÷ BPW)</span>
                                                <span className="font-mono text-green-600 font-medium">
                                                    {efficiency.toFixed(2)}×
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <details className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <summary className="cursor-pointer font-mono text-sm font-semibold text-gray-700 hover:text-indigo-600">
                                View Raw Results
                            </summary>
                            <pre className="mt-3 text-xs overflow-auto max-h-96 bg-white p-4 rounded border border-gray-300 text-gray-800">
                                {JSON.stringify(run.results, null, 2)}
                            </pre>
                        </details>
                    </>
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

import React, { useState, useEffect } from 'react';

export default function Benchmark() {
    const [modelPath, setModelPath] = useState('');
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [availableTasks, setAvailableTasks] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ id?: string, msg?: string }>({});

    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/tasks')
            .then(res => res.json())
            .then(data => setAvailableTasks(data.tasks || []))
            .catch(err => console.error("Failed to load tasks", err));
    }, []);

    const handleTaskToggle = (task: string) => {
        setSelectedTasks(prev =>
            prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modelPath || selectedTasks.length === 0) return;

        setLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_path: modelPath,
                    tasks: selectedTasks
                })
            });
            const data = await res.json();
            setStatus({ id: data.run_id, msg: "Benchmark started successfully! View progress in the Results tab." });
        } catch (err) {
            setStatus({ msg: "Failed to start benchmark." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                    <h2 className="text-2xl font-bold text-gray-900">Configure Benchmark Run</h2>
                    <p className="text-gray-500 mt-1">Set up your local model and select evaluation tasks</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            GGUF Model Path (Local absolute path)
                        </label>
                        <input
                            type="text"
                            value={modelPath}
                            onChange={(e) => setModelPath(e.target.value)}
                            placeholder="C:\models\llama-2-7b.Q4_K_M.gguf"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm shadow-sm"
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Select Evaluation Tasks
                        </label>
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            {availableTasks.length === 0 && <p className="text-sm text-gray-500 col-span-2">Loading tasks...</p>}
                            {availableTasks.map(task => (
                                <label key={task} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                                            checked={selectedTasks.includes(task)}
                                            onChange={() => handleTaskToggle(task)}
                                        />
                                        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-900">{task}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                            {status.msg && (
                                <p className={`text-sm ${status.id ? 'text-green-600' : 'text-red-500'} font-medium`}>
                                    {status.msg}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !modelPath || selectedTasks.length === 0}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-md shadow-indigo-200 flex items-center gap-2"
                        >
                            {loading ? 'Starting...' : 'Start Evaluation'}
                            {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

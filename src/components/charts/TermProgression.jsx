import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TermProgression({ data }) {
    const TERMS_ORDER = ["Autumn", "Spring", "Summer"];

    // Aggregate data by Term
    const termData = data.reduce((acc, curr) => {
        if (!acc[curr.Term]) {
            acc[curr.Term] = { Term: curr.Term, Total: 0, Count: 0 };
        }
        acc[curr.Term].Total += curr.Score;
        acc[curr.Term].Count += 1;
        return acc;
    }, {});

    const chartData = TERMS_ORDER.map(term => {
        const d = termData[term];
        return {
            name: term,
            Average: d ? Math.round(d.Total / d.Count) : 0
        };
    });

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Term Progression</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} padding={{ left: 20, right: 20 }} />
                        <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip
                            cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="Average"
                            stroke="#4F46E5"
                            strokeWidth={3}
                            dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

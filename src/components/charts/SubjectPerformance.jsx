import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function SubjectPerformance({ data }) {
    // Aggregate data by Subject
    const subjectData = data.reduce((acc, curr) => {
        if (!acc[curr.Subject]) {
            acc[curr.Subject] = { Subject: curr.Subject, Total: 0, Count: 0 };
        }
        acc[curr.Subject].Total += curr.Score;
        acc[curr.Subject].Count += 1;
        return acc;
    }, {});

    const chartData = Object.values(subjectData).map(d => ({
        name: d.Subject,
        Average: Math.round(d.Total / d.Count)
    })).sort((a, b) => b.Average - a.Average);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Subject Performance</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip
                            cursor={{ fill: '#F3F4F6' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="Average" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function DemographicGap({ data, category = "Sex", label1 = "M", label2 = "F" }) {
    // Aggregate data by Subject AND Category
    const subjectData = data.reduce((acc, curr) => {
        if (!acc[curr.Subject]) {
            acc[curr.Subject] = {
                Subject: curr.Subject,
                Group1Total: 0, Group1Count: 0,
                Group2Total: 0, Group2Count: 0
            };
        }

        if (curr[category] === label1) {
            acc[curr.Subject].Group1Total += curr.Score;
            acc[curr.Subject].Group1Count += 1;
        } else if (curr[category] === label2 || (label2 === "Other" && curr[category] !== label1)) {
            // Simple logic for binary comparison, can be expanded
            acc[curr.Subject].Group2Total += curr.Score;
            acc[curr.Subject].Group2Count += 1;
        }
        return acc;
    }, {});

    const chartData = Object.values(subjectData).map(d => ({
        name: d.Subject,
        [label1]: d.Group1Count ? Math.round(d.Group1Total / d.Group1Count) : 0,
        [label2]: d.Group2Count ? Math.round(d.Group2Total / d.Group2Count) : 0,
    }));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Performance Gap: {category}</h3>
            </div>
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
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey={label1} fill="#4F46E5" radius={[4, 4, 0, 0]} name={label1} />
                        <Bar dataKey={label2} fill="#E0E7FF" radius={[4, 4, 0, 0]} name={label2} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

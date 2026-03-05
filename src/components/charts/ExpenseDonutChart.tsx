import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DonutPoint {
  name: string;
  value: number;
  color: string;
}

interface ExpenseDonutChartProps {
  data: DonutPoint[];
}

export const ExpenseDonutChart = ({ data }: ExpenseDonutChartProps) => (
  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface NetWorthPoint {
  month: string;
  netWorth: number;
}

interface NetWorthChartProps {
  data: NetWorthPoint[];
}

export const NetWorthChart = ({ data }: NetWorthChartProps) => (
  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="netWorth" stroke="#22c55e" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

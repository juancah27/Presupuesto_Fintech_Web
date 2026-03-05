import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CashflowPoint {
  month: string;
  income: number;
  expense: number;
}

interface CashflowChartProps {
  data: CashflowPoint[];
}

export const CashflowChart = ({ data }: CashflowChartProps) => (
  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" name="Ingresos" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" fill="#ef4444" name="Gastos" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

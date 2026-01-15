"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import type { MenuItem } from "@/lib/data"

interface NutritionChartProps {
  menu: MenuItem
}

export function NutritionChart({ menu }: NutritionChartProps) {
  const data = [
    { name: "단백질", value: menu.protein * 4, color: "#4CAF50" },
    { name: "탄수화물", value: menu.carbs * 4, color: "#F4C430" },
    { name: "지방", value: menu.fat * 9, color: "#FF8C42" },
  ]

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend formatter={(value, entry) => <span className="text-xs text-foreground">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

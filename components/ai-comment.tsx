"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

interface AICommentProps {
  comment: string
  type?: "suggestion" | "warning" | "praise"
}

export function AIComment({ comment, type = "suggestion" }: AICommentProps) {
  const bgColors = {
    suggestion: "bg-primary/10 border-primary/30",
    warning: "bg-chart-2/10 border-chart-2/30",
    praise: "bg-chart-3/10 border-chart-3/30",
  }

  const iconColors = {
    suggestion: "text-primary",
    warning: "text-chart-2",
    praise: "text-chart-3",
  }

  return (
    <Card className={`border-2 ${bgColors[type]}`}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`mt-0.5 ${iconColors[type]}`}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">AI 미식 비서</p>
          <p className="text-sm text-foreground">{comment}</p>
        </div>
      </CardContent>
    </Card>
  )
}

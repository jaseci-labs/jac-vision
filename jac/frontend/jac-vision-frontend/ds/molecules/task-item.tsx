"use client"

import type { Task } from "@/store/tasksSlice";
import { Card, CardContent, CardFooter, CardHeader } from "@/ds/atoms/card";
import { Checkbox } from "@/ds/atoms/checkbox";
import { Button } from "@/ds/atoms/button";
import { Badge } from "@/ds/atoms/badge";
import { Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/_core/utils";

interface TaskItemProps {
  task: Task
  onToggleComplete: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

const priorityColors = {
  low: "bg-green-100 text-green-800 hover:bg-green-100",
  medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  high: "bg-red-100 text-red-800 hover:bg-red-100",
}

export function TaskItem({ task, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Checkbox checked={task.completed} onCheckedChange={() => onToggleComplete(task.id)} id={`task-${task.id}`} />
          <label
            htmlFor={`task-${task.id}`}
            className={`font-medium text-lg ${task.completed ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </label>
        </div>
        <Badge variant="outline" className={cn(priorityColors[task.priority], "font-medium")}>
          {task.priority}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className={`text-sm ${task.completed ? "text-muted-foreground" : ""}`}>{task.description}</p>
        {task.dueDate && (
          <p className="text-xs text-muted-foreground mt-2">
            Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}


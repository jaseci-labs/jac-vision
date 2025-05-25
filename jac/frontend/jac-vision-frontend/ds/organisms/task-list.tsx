"use client"

import { useState } from "react"
import type { Task } from "@/store/tasksSlice";
import { TaskItem } from "@/ds/molecules/task-item"
import { Button } from "@/ds/atoms/button"
import { Plus } from "lucide-react"
import { TaskForm } from "./task-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ds/atoms/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/atoms/select"
import { Input } from "@/ds/atoms/input"

interface TaskListProps {
  tasks: Task[]
  onAddTask: (task: Omit<Task, "id" | "completed">) => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onToggleComplete: (id: string) => void
}

export function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask, onToggleComplete }: TaskListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const handleAddTask = (taskData: Omit<Task, "id" | "completed">) => {
    onAddTask(taskData)
    setIsAddDialogOpen(false)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }

  const handleUpdateTask = (taskData: Omit<Task, "id" | "completed">) => {
    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        ...taskData,
      })
      setIsEditDialogOpen(false)
      setEditingTask(null)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    // Filter by status
    if (filterStatus === "completed" && !task.completed) return false
    if (filterStatus === "active" && task.completed) return false

    // Filter by priority
    if (filterPriority !== "all" && task.priority !== filterPriority) return false

    // Filter by search term
    if (
      searchTerm &&
      !task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !task.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No tasks found. Add a new task to get started.</div>
      ) : (
        <div>
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onEdit={handleEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <TaskForm onSubmit={handleAddTask} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              initialValues={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


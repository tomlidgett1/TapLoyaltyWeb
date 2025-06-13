"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Plus, 
  MoreHorizontal, 
  Calendar,
  Trash2,
  Edit,
  Tag,
  GitBranch,
  CheckSquare,
  Square
} from "lucide-react"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp 
} from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high'
  assignee?: string | null
  dueDate?: Date | null
  theme?: string | null
  parentTaskId?: string | null
  completed?: boolean
  createdAt: Date
  updatedAt: Date
}

interface Column {
  id: string
  title: string
  color: string
}

const defaultColumns: Column[] = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' }
]

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
}

const defaultThemes = ['Agent', 'Reward', 'Design']

const themeColors = {
  'Agent': 'bg-purple-100 text-purple-800',
  'Reward': 'bg-blue-100 text-blue-800',
  'Design': 'bg-pink-100 text-pink-800'
}

export default function PlanPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignee: '',
    dueDate: '',
    theme: 'none',
    parentTaskId: null as string | null
  })
  const [customThemes, setCustomThemes] = useState<string[]>([])
  const [isAddingTheme, setIsAddingTheme] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    task: Task | null
  } | null>(null)


  // Check for URL parameter to open add task dialog
  useEffect(() => {
    if (!searchParams) return
    
    const addTaskParam = searchParams.get('addTask')
    if (addTaskParam === 'true') {
      setIsAddingTask(true)
      // Clean up URL parameter
      const url = new URL(window.location.href)
      url.searchParams.delete('addTask')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // Load tasks from Firestore
  useEffect(() => {
    if (!user?.uid) return

    const tasksRef = collection(db, 'merchants', user.uid, 'tasks')
    const q = query(tasksRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        dueDate: doc.data().dueDate?.toDate() || undefined
      })) as Task[]

      setTasks(tasksData)
    })

    return () => unsubscribe()
  }, [user?.uid])

  // Handle clicking outside context menu
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('scroll', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('scroll', handleClickOutside)
    }
  }, [contextMenu])

  const handleAddTask = async () => {
    if (!user?.uid || !newTask.title.trim()) return

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignee: newTask.assignee || null,
        dueDate: newTask.dueDate ? Timestamp.fromDate(new Date(newTask.dueDate)) : null,
        theme: newTask.theme === 'none' ? null : newTask.theme,
        parentTaskId: newTask.parentTaskId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await addDoc(collection(db, 'merchants', user.uid, 'tasks'), taskData)

      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: '',
        dueDate: '',
        theme: 'none',
        parentTaskId: null
      })
      setIsAddingTask(false)
      
      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error) {
      console.error("Error adding task:", error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      })
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user?.uid) return

    try {
      const taskRef = doc(db, 'merchants', user.uid, 'tasks', taskId)
      
      // Clean the updates object to remove undefined values
      const cleanUpdates: any = {
        updatedAt: Timestamp.now()
      }
      
      // Only add fields that have actual values
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'dueDate' && value) {
          cleanUpdates.dueDate = Timestamp.fromDate(value as Date)
        } else if (key === 'assignee') {
          // Handle assignee specially - use null instead of undefined
          cleanUpdates.assignee = value || null
        } else if (value !== undefined && value !== '') {
          cleanUpdates[key] = value
        }
      })
      
      await updateDoc(taskRef, cleanUpdates)
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!user?.uid) return

    try {
      await deleteDoc(doc(db, 'merchants', user.uid, 'tasks', taskId))
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      })
    }
  }



  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    
    if (draggedTask && draggedTask.status !== status) {
      handleUpdateTask(draggedTask.id, { status })
    }
    
    setDraggedTask(null)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const getTasksByStatus = (status: string) => {
    // Only return parent tasks (tasks without parentTaskId)
    return tasks.filter(task => task.status === status && !task.parentTaskId)
  }
  
  const getSubtasks = (parentTaskId: string) => {
    return tasks.filter(task => task.parentTaskId === parentTaskId)
  }
  
  const handleToggleTaskCompletion = async (taskId: string, completed: boolean) => {
    if (!user?.uid) return
    
    try {
      await handleUpdateTask(taskId, { 
        completed: !completed,
        // If marking as complete, move to 'done' status, otherwise move to 'todo'
        status: completed ? 'todo' : 'done'
      })
    } catch (error) {
      console.error("Error toggling task completion:", error)
    }
  }

  const TaskCard = ({ task, isSubtask = false }: { task: Task; isSubtask?: boolean }) => (
    <Card 
      className={cn(
        "mb-3 cursor-move hover:shadow-md transition-shadow rounded-md",
        isSubtask && "bg-gray-50 border-l-4 border-l-gray-300 shadow-sm",
        task.completed && isSubtask && "bg-green-50 border-l-green-300 opacity-75"
      )}
      draggable={true}
      onDragStart={(e) => {
        // Only allow drag if not clicking on interactive elements
        const target = e.target as HTMLElement
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          e.preventDefault()
          return
        }
        handleDragStart(e, task)
      }}
      onDragEnd={handleDragEnd}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setEditingTask(task)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({
          x: e.pageX,
          y: e.pageY,
          task: task
        })
      }}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-1">
            {isSubtask && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleTaskCompletion(task.id, task.completed || false)
                  }}
                  className="hover:bg-gray-200 rounded p-0.5 transition-colors"
                  title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {task.completed ? (
                    <CheckSquare className="h-3 w-3 text-green-600" />
                  ) : (
                    <Square className="h-3 w-3 text-gray-400" />
                  )}
                </button>
                <GitBranch className="h-3 w-3 text-gray-400 flex-shrink-0" />
              </div>
            )}
            <h4 className={cn(
              "font-medium text-sm",
              task.completed && "line-through text-gray-500"
            )}>
              {task.title}
            </h4>
            {!isSubtask && getSubtasks(task.id).length > 0 && (
              <Badge variant="secondary" className="text-xs rounded-sm ml-auto mr-2">
                {getSubtasks(task.id).filter(st => st.completed).length}/{getSubtasks(task.id).length} complete
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingTask(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleToggleTaskCompletion(task.id, task.completed || false)}>
                {task.completed ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Mark as Incomplete
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Mark as Complete
                  </>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                // Create a subtask for this task
                setNewTask({
                  title: '',
                  description: '',
                  status: task.status, // Inherit parent's status
                  priority: 'medium',
                  assignee: '',
                  dueDate: '',
                  theme: 'none',
                  parentTaskId: task.id
                })
                setIsAddingTask(true)
              }}>
                <GitBranch className="h-4 w-4 mr-2" />
                Add Subtask
              </DropdownMenuItem>
              
              {/* Theme options - flattened to avoid nested dropdowns */}
              {[...defaultThemes, ...customThemes].map(theme => (
                <DropdownMenuItem 
                  key={`theme-${theme}`}
                  onClick={() => handleUpdateTask(task.id, { theme })}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  {theme}
                </DropdownMenuItem>
              ))}
              
              {task.theme && (
                <DropdownMenuItem onClick={() => handleUpdateTask(task.id, { theme: null })}>
                  <Tag className="h-4 w-4 mr-2" />
                  Remove Theme
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={() => setIsAddingTheme(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Theme
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => handleDeleteTask(task.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {task.description && (
          <p className="text-xs text-gray-600 mb-3">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Days since created */}
            <Badge variant="secondary" className="text-xs rounded-sm">
              {(() => {
                const days = Math.floor((new Date().getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24))
                if (days === 0) return 'Today'
                if (days === 1) return 'Yesterday'
                return `${days}d ago`
              })()}
            </Badge>
            {task.theme && (
              <Badge className={cn("text-xs rounded-sm", themeColors[task.theme as keyof typeof themeColors] || 'bg-gray-100 text-gray-800')}>
                {task.theme}
              </Badge>
            )}
            {task.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {task.assignee.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {task.dueDate.toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const EditTaskDialog = () => {
    if (!editingTask) return null

    const [editData, setEditData] = useState({
      title: editingTask.title,
      description: editingTask.description || '',
      priority: editingTask.priority,
      assignee: editingTask.assignee || '',
      dueDate: editingTask.dueDate ? editingTask.dueDate.toISOString().split('T')[0] : '',
      theme: editingTask.theme || 'none'
    })

    const handleSave = () => {
      handleUpdateTask(editingTask.id, {
        title: editData.title,
        description: editData.description,
        priority: editData.priority,
        assignee: editData.assignee.trim() || null,
        dueDate: editData.dueDate ? new Date(editData.dueDate) : null,
        theme: editData.theme === 'none' ? null : editData.theme
      })
      setEditingTask(null)
    }

    return (
      <Dialog open={true} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="rounded-md max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Task title"
                className="rounded-md"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Task description"
                className="rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={editData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setEditData({ ...editData, priority: value })}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assignee</Label>
                <Input
                  value={editData.assignee}
                  onChange={(e) => setEditData({ ...editData, assignee: e.target.value })}
                  placeholder="Assignee name"
                  className="rounded-md"
                />
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                className="rounded-md"
              />
            </div>
            <div>
              <Label>Theme</Label>
              <Select value={editData.theme} onValueChange={(value) => setEditData({ ...editData, theme: value })}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                                 <SelectContent>
                   <SelectItem value="none">No Theme</SelectItem>
                   {[...defaultThemes, ...customThemes].map(theme => (
                     <SelectItem key={theme} value={theme}>
                       {theme}
                     </SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingTask(null)} className="rounded-md">
                Cancel
              </Button>
              <Button type="submit" className="rounded-md">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const ContextMenu = () => {
    if (!contextMenu || !contextMenu.task) return null

    const task = contextMenu.task
    const isSubtask = !!task.parentTaskId

    return (
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
        style={{
          left: contextMenu.x,
          top: contextMenu.y
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          onClick={() => {
            setEditingTask(task)
            setContextMenu(null)
          }}
        >
          <Edit className="h-4 w-4" />
          Edit
        </button>

        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          onClick={() => {
            handleToggleTaskCompletion(task.id, task.completed || false)
            setContextMenu(null)
          }}
        >
          {task.completed ? (
            <>
              <Square className="h-4 w-4" />
              Mark as Incomplete
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4" />
              Mark as Complete
            </>
          )}
        </button>

        {!isSubtask && (
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              setNewTask({
                title: '',
                description: '',
                status: task.status,
                priority: 'medium',
                assignee: '',
                dueDate: '',
                theme: 'none',
                parentTaskId: task.id
              })
              setIsAddingTask(true)
              setContextMenu(null)
            }}
          >
            <GitBranch className="h-4 w-4" />
            Add Subtask
          </button>
        )}

        <div className="border-t border-gray-100 my-1"></div>

        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
          onClick={() => {
            handleDeleteTask(task.id)
            setContextMenu(null)
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {defaultColumns.map((column, index) => (
            <div key={column.id} className="flex flex-col">
              <div className={cn("rounded-md p-3 mb-4", column.color)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs rounded-sm">
                      {getTasksByStatus(column.id).length}
                    </Badge>
                    {/* Add Task button only in first column */}
                    {index === 0 && (
                      <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="rounded-md h-6 px-2 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-md max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {newTask.parentTaskId ? 'Create New Subtask' : 'Create New Task'}
                            </DialogTitle>
                          </DialogHeader>
                          <form onSubmit={(e) => {
                            e.preventDefault()
                            handleAddTask()
                          }} className="space-y-4">
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Task title"
                                className="rounded-md"
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Task description"
                                className="rounded-md"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Status</Label>
                                <Select value={newTask.status} onValueChange={(value) => setNewTask({ ...newTask, status: value })}>
                                  <SelectTrigger className="rounded-md">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {defaultColumns.map(column => (
                                      <SelectItem key={column.id} value={column.id}>
                                        {column.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <Select value={newTask.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTask({ ...newTask, priority: value })}>
                                  <SelectTrigger className="rounded-md">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Assignee</Label>
                                <Input
                                  value={newTask.assignee}
                                  onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                                  placeholder="Assignee name"
                                  className="rounded-md"
                                />
                              </div>
                              <div>
                                <Label>Due Date</Label>
                                <Input
                                  type="date"
                                  value={newTask.dueDate}
                                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                  className="rounded-md"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Theme</Label>
                              <Select value={newTask.theme} onValueChange={(value) => setNewTask({ ...newTask, theme: value })}>
                                <SelectTrigger className="rounded-md">
                                  <SelectValue placeholder="Select a theme" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Theme</SelectItem>
                                  {[...defaultThemes, ...customThemes].map(theme => (
                                    <SelectItem key={theme} value={theme}>
                                      {theme}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setIsAddingTask(false)} className="rounded-md">
                                Cancel
                              </Button>
                              <Button type="submit" className="rounded-md">
                                {newTask.parentTaskId ? 'Create Subtask' : 'Create Task'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
              
              <div 
                className="flex-1 min-h-[400px] p-2 rounded-md border-2 border-dashed border-gray-200 transition-colors hover:border-gray-300"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                onDoubleClick={() => {
                  // Set the new task status to the column and open the dialog
                  setNewTask({
                    title: '',
                    description: '',
                    status: column.id,
                    priority: 'medium',
                    assignee: '',
                    dueDate: '',
                    theme: 'none',
                    parentTaskId: null
                  })
                  setIsAddingTask(true)
                }}
                title="Double-click to add a new task"
              >
                {getTasksByStatus(column.id).map(task => (
                  <div key={task.id}>
                    <TaskCard task={task} />
                    {/* Render subtasks */}
                    {getSubtasks(task.id).map(subtask => (
                      <div key={subtask.id} className="ml-6 relative">
                        {/* Connection line */}
                        <div className="absolute -left-6 top-0 bottom-0 w-6 flex items-start justify-center pt-4">
                          <div className="w-0 h-4 border-l-2 border-gray-300"></div>
                          <div className="w-4 h-0 border-t-2 border-gray-300 -mt-2"></div>
                        </div>
                        <TaskCard task={subtask} isSubtask={true} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingTask && <EditTaskDialog />}
      
      {/* Add Theme Dialog */}
      <Dialog open={isAddingTheme} onOpenChange={setIsAddingTheme}>
        <DialogContent className="rounded-md max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Theme Name</Label>
              <Input
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Enter theme name"
                className="rounded-md"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newThemeName.trim()) {
                      setCustomThemes(prev => [...prev, newThemeName.trim()])
                      setNewThemeName('')
                      setIsAddingTheme(false)
                      toast({
                        title: "Success",
                        description: "Theme added successfully",
                      })
                    }
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddingTheme(false)
                  setNewThemeName('')
                }} 
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (newThemeName.trim()) {
                    setCustomThemes(prev => [...prev, newThemeName.trim()])
                    setNewThemeName('')
                    setIsAddingTheme(false)
                    toast({
                      title: "Success",
                      description: "Theme added successfully",
                    })
                  }
                }}
                className="rounded-md"
              >
                Add Theme
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      <ContextMenu />
    </DashboardLayout>
  )
} 
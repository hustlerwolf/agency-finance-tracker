'use client'

import { useState } from 'react'
import { saveCategory, deleteCategory } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export function CategoryClient({ categories }: { categories: Category[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  function openEditModal(category: Category) {
    setEditingCategory(category)
    setIsOpen(true)
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) setEditingCategory(null)
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await saveCategory(formData)
    
    if (result.success) {
      toast.success(editingCategory ? "Category updated!" : "Category added!")
      handleOpenChange(false)
    } else {
      toast.error("Failed to save: " + result.error)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return
    
    const result = await deleteCategory(id)
    if (result.success) toast.success("Category deleted")
    else toast.error(result.error)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Expense Categories</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild><Button>Add Category</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              {editingCategory && <input type="hidden" name="id" value={editingCategory.id} />}
              
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input id="name" name="name" defaultValue={editingCategory?.name || ''} placeholder="e.g., Software Subscriptions" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" defaultValue={editingCategory?.description || ''} placeholder="Optional details..." />
              </div>

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? "Saving..." : (editingCategory ? "Update Category" : "Save Category")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.description || '-'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEditModal(category)}>Edit</Button>
                  <Button variant="destructive" size="sm" className="rounded-lg" onClick={() => handleDelete(category.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No categories defined yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
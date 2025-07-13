import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DataTablePaginationProps {
  total: number
  pageSize: number
  pageIndex: number
  onPageSizeChange: (pageSize: number) => void
  onPageChange: (pageIndex: number) => void
}

export function DataTablePagination({
  total,
  pageSize,
  pageIndex,
  onPageSizeChange,
  onPageChange,
}: DataTablePaginationProps) {
  const pageCount = Math.ceil(total / pageSize)
  const canPreviousPage = pageIndex > 0
  const canNextPage = pageIndex < pageCount - 1

  const goToPreviousPage = () => {
    if (canPreviousPage) {
      onPageChange(pageIndex - 1)
    }
  }

  const goToNextPage = () => {
    if (canNextPage) {
      onPageChange(pageIndex + 1)
    }
  }

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value))
              onPageChange(0) // Reset to first page when changing page size
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={goToPreviousPage}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={goToNextPage}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
// apps/web/src/shared/ui/index.js
//
// Public surface of the shadcn-style primitives. Deep-imports are fine for
// rarely-used components; this barrel is for the ones that show up across
// multiple features.

export { Toaster } from './sonner';
export { PageSkeleton } from './page-skeleton';
export { PanelSkeleton } from './panel-skeleton';
export { ChartExportButton } from './chart-export';
export { default as DataTable } from './data-table';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet';

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from './popover';

export { cn } from './cn';
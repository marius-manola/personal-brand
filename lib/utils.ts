import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Standard shadcn/Magic UI class merger. Registry components in components/ui
// import this from "@/lib/utils"; nothing else in the app depends on it.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import type { NavigateOptions, RegisteredRouter } from '@tanstack/react-router';

export interface DialogNavigationOptions {
  to: string
  params?: Record<string, string>
  search?: false | NavigateOptions<RegisteredRouter, string, string>['search']
  isSubmitting?: boolean
}

import { queryOptions } from '@tanstack/react-query'
import * as library from '@/services/content-library.service'

export const contentLibraryQuery = () =>
  queryOptions({
    queryKey: ['content-library', 'items'],
    queryFn: () => library.listLibrary(),
  })

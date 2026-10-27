import { listQuery } from '@shared/schemas'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createColumnHelper, type PaginationState } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type DataTableFeatures } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { roleOf } from '@/lib/auth-client'
import { type AdminUser, adminUsersQuery } from '@/queries/user.queries'

export const Route = createFileRoute('/_app/admin/users')({
  // UX only: the API's requireRole('admin') is the real check.
  beforeLoad: ({ context }) => {
    if (roleOf(context.session) !== 'admin') throw redirect({ to: '/dashboard' })
  },
  validateSearch: listQuery,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(adminUsersQuery(deps)),
  component: UsersPage,
})

const columnHelper = createColumnHelper<DataTableFeatures, AdminUser>()
const EMPTY: AdminUser[] = []

function UsersPage() {
  const { t, i18n } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const users = useQuery(adminUsersQuery(search))

  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize }

  const columns = useMemo(() => {
    const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
    return columnHelper.columns([
      columnHelper.accessor('name', {
        header: () => t('users.columnName'),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('email', {
        header: () => t('users.columnEmail'),
      }),
      columnHelper.accessor('role', {
        header: () => t('users.columnRole'),
        cell: (info) => {
          const role = info.getValue()
          return (
            <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
              {role === 'admin' || role === 'user' ? t(`users.roles.${role}`) : role}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('createdAt', {
        header: () => t('users.columnJoined'),
        cell: (info) => (
          <time dateTime={String(info.getValue())} className="text-muted-foreground">
            {dateFormat.format(new Date(info.getValue()))}
          </time>
        ),
      }),
    ])
  }, [t, i18n.language])

  return (
    <>
      <PageHeader title={t('users.title')} description={t('users.subtitle')} />
      {users.isError ? (
        <div role="alert" className="grid justify-items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">{t('errors.generic')}</p>
          <Button variant="outline" onClick={() => void users.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users.data?.items ?? EMPTY}
          rowCount={users.data?.total ?? 0}
          getRowId={(user) => user.id}
          isLoading={users.isPending}
          pagination={pagination}
          onPaginationChange={(next) =>
            void navigate({
              search: (prev) => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }),
            })
          }
          empty={<p className="text-muted-foreground">{t('users.empty')}</p>}
        />
      )}
    </>
  )
}

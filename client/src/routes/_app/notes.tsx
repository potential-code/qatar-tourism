import { listQuery, noteInput } from '@shared/schemas'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createColumnHelper, type PaginationState } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable, type DataTableFeatures } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppForm } from '@/hooks/useAppForm'
import { ApiError } from '@/lib/api'
import {
  type Note,
  notesListQuery,
  useCreateNote,
  useDeleteNote,
  useUpdateNote,
} from '@/queries/note.queries'

// Page and page size live in the URL (?page=2&pageSize=20), validated by the same schema the
// API uses, so links and the back button work.
export const Route = createFileRoute('/_app/notes')({
  validateSearch: listQuery,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(notesListQuery(deps)),
  component: NotesPage,
})

const columnHelper = createColumnHelper<DataTableFeatures, Note>()

type DialogState = { mode: 'create' } | { mode: 'edit'; note: Note } | null

function NotesPage() {
  const { t, i18n } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const notes = useQuery(notesListQuery(search))
  const deleteNote = useDeleteNote()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [toDelete, setToDelete] = useState<Note | null>(null)

  const pagination: PaginationState = { pageIndex: search.page - 1, pageSize: search.pageSize }

  const columns = useMemo(() => {
    const dateFormat = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return columnHelper.columns([
      columnHelper.accessor('title', {
        header: () => t('notes.columnTitle'),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('updatedAt', {
        header: () => t('notes.columnUpdated'),
        cell: (info) => (
          <time dateTime={info.getValue()} className="text-muted-foreground">
            {dateFormat.format(new Date(info.getValue()))}
          </time>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('common.actions')}</span>,
        cell: ({ row }) => (
          <div className="text-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('common.openActions')}>
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDialog({ mode: 'edit', note: row.original })}>
                  <Pencil aria-hidden />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(row.original)}>
                  <Trash2 aria-hidden />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ])
  }, [t, i18n.language])

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteNote.mutateAsync(toDelete.id)
      toast.success(t('notes.deleted'))
      setToDelete(null)
      // Step back a page if that was the last row on it.
      if (notes.data && notes.data.items.length === 1 && search.page > 1) {
        await navigate({ search: (prev) => ({ ...prev, page: search.page - 1 }) })
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
    }
  }

  const newButton = (
    <Button onClick={() => setDialog({ mode: 'create' })}>
      <Plus aria-hidden />
      {t('notes.new')}
    </Button>
  )

  return (
    <>
      <PageHeader title={t('notes.title')} description={t('notes.subtitle')} actions={newButton} />

      {notes.isError ? (
        <div role="alert" className="grid justify-items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">{t('errors.generic')}</p>
          <Button variant="outline" onClick={() => void notes.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={notes.data?.items ?? EMPTY}
          rowCount={notes.data?.total ?? 0}
          getRowId={(note) => note.id}
          isLoading={notes.isPending}
          pagination={pagination}
          onPaginationChange={(next) =>
            void navigate({
              search: (prev) => ({ ...prev, page: next.pageIndex + 1, pageSize: next.pageSize }),
            })
          }
          empty={
            <div className="grid justify-items-center gap-3">
              <p className="text-muted-foreground">{t('notes.empty')}</p>
              <Button variant="outline" onClick={() => setDialog({ mode: 'create' })}>
                {t('notes.emptyCta')}
              </Button>
            </div>
          }
        />
      )}

      <NoteDialog state={dialog} onClose={() => setDialog(null)} />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t('notes.deleteTitle')}
        description={t('notes.deleteBody', { title: toDelete?.title ?? '' })}
        confirmLabel={t('common.delete')}
        pending={deleteNote.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

const EMPTY: Note[] = []

// The shared create schema, with `body` required: the form always holds a string, and the
// form library wants schema input and form values to line up.
const noteForm = noteInput.extend({ body: noteInput.shape.body.unwrap() })

function NoteDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state?.mode === 'edit' ? t('notes.editTitle') : t('notes.createTitle')}
          </DialogTitle>
          <DialogDescription>{t('notes.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {/* Keyed so the form resets to the right values each time it opens. */}
        {state ? (
          <NoteForm
            key={state.mode === 'edit' ? state.note.id : 'new'}
            note={state.mode === 'edit' ? state.note : null}
            onDone={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function NoteForm({ note, onDone }: { note: Note | null; onDone: () => void }) {
  const { t } = useTranslation()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()

  const form = useAppForm({
    defaultValues: { title: note?.title ?? '', body: note?.body ?? '' },
    // The API's own schema (see noteForm), so client and server reject the same input.
    validators: { onSubmit: noteForm },
    onSubmit: async ({ value }) => {
      const input = noteForm.parse(value)
      try {
        if (note) {
          await updateNote.mutateAsync({ id: note.id, input })
          toast.success(t('notes.updated'))
        } else {
          await createNote.mutateAsync(input)
          toast.success(t('notes.created'))
        }
        onDone()
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : t('errors.generic'))
      }
    },
  })

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.AppField name="title">
        {(field) => <field.TextField label={t('notes.fieldTitle')} autoFocus />}
      </form.AppField>
      <form.AppField name="body">
        {(field) => <field.TextareaField label={t('notes.fieldBody')} rows={6} />}
      </form.AppField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <form.AppForm>
          <form.SubmitButton>{t('common.save')}</form.SubmitButton>
        </form.AppForm>
      </DialogFooter>
    </form>
  )
}

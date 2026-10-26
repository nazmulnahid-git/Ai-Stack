import { ApiStatus } from './_components/api-status'

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">__TITLE__</h1>
          <p className="text-sm text-muted-foreground">
            __DESCRIPTION__
          </p>
        </div>
        <ApiStatus />
        <p className="font-mono text-xs text-muted-foreground">
          Press <kbd>d</kbd> to toggle dark mode
        </p>
      </div>
    </main>
  )
}

import type { Metadata } from 'next'
import { HeaderWidget } from '@/widgets/header/HeaderWidget'

export const metadata: Metadata = {
  title: 'Dashboard — TermSync',
}

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderWidget />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-gray-500">Your terms will appear here.</p>
      </main>
    </div>
  )
}

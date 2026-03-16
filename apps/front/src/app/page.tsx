import { HeaderWidget } from '@/widgets/header/HeaderWidget'
import { AccountCard } from '@/widgets/account/AccountCard'

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <HeaderWidget />
      <main className="mx-auto max-w-lg px-4 py-12">
        <AccountCard />
      </main>
    </>
  )
}

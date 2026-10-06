import type { Metadata } from 'next'
import { BrowseScreen } from '@/components/items/browse-screen'

export const metadata: Metadata = {
  title: 'Browse items — CaintaTrade',
}

export default function BrowsePage() {
  return <BrowseScreen />
}

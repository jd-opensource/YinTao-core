import { live as live2 } from '@cherry-next/cherry-core/lib/live'

export default async function live(url: string, opts: any) {
  const script = await live2(url, opts)
  return script
}

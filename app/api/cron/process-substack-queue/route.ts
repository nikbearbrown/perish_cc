import { NextRequest, NextResponse } from 'next/server'
import { processExportQueue } from '@/lib/substack'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await processExportQueue()

  console.log(JSON.stringify({
    cron: 'process-substack-queue',
    ...result,
    run_at: new Date().toISOString(),
  }))

  return NextResponse.json(result)
}

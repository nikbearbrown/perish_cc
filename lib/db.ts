import { neon, NeonQueryFunction } from '@neondatabase/serverless'

function getDbUrl(): string {
  const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!
  return raw.replace(/[?&]channel_binding=[^&]*/g, '').replace(/\?&/, '?').replace(/\?$/, '')
}

let _sql: NeonQueryFunction<false, false> | null = null

export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      if (!_sql) _sql = neon(getDbUrl())
      return (_sql as Function)(...args)
    },
    get(_target, prop) {
      if (!_sql) _sql = neon(getDbUrl())
      return Reflect.get(_sql, prop)
    },
  }
)

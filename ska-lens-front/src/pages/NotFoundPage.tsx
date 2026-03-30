import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-semibold text-slate-900">404</h1>
      <p className="text-slate-600">页面不存在。</p>
      <Link to="/" className="rounded-md bg-slate-900 px-4 py-2 text-white">
        返回首页
      </Link>
    </div>
  )
}

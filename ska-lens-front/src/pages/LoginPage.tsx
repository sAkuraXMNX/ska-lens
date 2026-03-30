import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { skaLensApi } from '../api/skaLensApi'
import { authStore } from '../lib/auth'

interface LocationState {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: skaLensApi.login,
    onSuccess: (data) => {
      authStore.setToken(data.token)
      const state = location.state as LocationState | null
      const redirectPath = state?.from?.pathname ?? '/admin'
      navigate(redirectPath, { replace: true })
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({ username, password })
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">管理台登录</h1>
        <p className="text-sm text-slate-500">请使用管理员账号登录。</p>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">用户名</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">密码</span>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mutation.isError && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">登录失败，请检查用户名或密码。</div>}
        <button type="submit" disabled={mutation.isPending} className="w-full rounded-md bg-slate-900 px-4 py-2 text-white">
          {mutation.isPending ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}

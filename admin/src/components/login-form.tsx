'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLogin } from '@/hooks/use-auth'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Quran Kids Admin</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => { login.reset(); login.mutate(data) })} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
            {errors.email && <p id="email-error" className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
            {errors.password && <p id="password-error" className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          {login.isError && (
            <p className="text-sm text-red-500">
              {login.error instanceof Error ? login.error.message : 'Login gagal'}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

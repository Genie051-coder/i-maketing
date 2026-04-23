'use client'

import { useState } from 'react'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { Box, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/ui/basic/dialog'
import { Button } from '@/shared/ui/basic/button'
import { Input } from '@/shared/ui/basic/input'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldContent,
  FieldSeparator,
} from '@/shared/ui/basic/field'
import { Card, CardContent } from '@/shared/ui/basic/card'
import { useTranslations } from 'next-intl'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import googleIcon from '@/shared/assets/google.svg'
import Link from 'next/link'

type AuthModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PASSWORD_MIN = 8

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const t = useTranslations('auth')
  const isMobile = useIsMobile()
  const [view, setView] = useState<'login' | 'signup'>('login')
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
    setError(null)
  }

  const switchView = (next: 'login' | 'signup') => {
    resetForm()
    setView(next)
  }

  const handleGoogleSignIn = () => {
    setError(null)
    setLoadingGoogle(true)
    signIn('google', { callbackUrl: window.location.pathname }).finally(() =>
      setLoadingGoogle(false)
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError(t('errors.fillRequired'))
      return
    }
    setCredentialsLoading(true)
    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        callbackUrl: window.location.pathname,
        redirect: false,
      })
      if (res?.error) {
        setError(t('errors.invalidCredentials'))
        return
      }
      if (res?.ok) {
        onOpenChange(false)
        window.location.reload()
      }
    } finally {
      setCredentialsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError(t('errors.fillRequired'))
      return
    }
    if (password.length < PASSWORD_MIN) {
      setError(t('errors.passwordMin', { min: PASSWORD_MIN }))
      return
    }
    setCredentialsLoading(true)
    try {
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      })
      const data = await registerRes.json().catch(() => ({}))
      if (!registerRes.ok) {
        setError(data.error ?? t('errors.signupFailed'))
        return
      }
      const signInRes = await signIn('credentials', {
        email: email.trim(),
        password,
        callbackUrl: window.location.pathname,
        redirect: false,
      })
      if (signInRes?.ok) {
        onOpenChange(false)
        window.location.reload()
      } else {
        setError(t('errors.invalidCredentials'))
      }
    } finally {
      setCredentialsLoading(false)
    }
  }

  const isLogin = view === 'login'
  const isLoading = credentialsLoading || loadingGoogle

  const formContent = (
    <form onSubmit={isLogin ? handleLogin : handleSignUp} className="p-6 md:p-8">
      <FieldGroup>
        {/* 헤더 */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{isLogin ? t('tabs.login') : t('tabs.signup')}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {isLogin ? t('modalDescription') : '이메일로 새 계정을 만들어보세요'}
          </p>
        </div>

        {/* 이름 (회원가입만) */}
        {!isLogin && (
          <Field>
            <FieldLabel htmlFor="auth-name">{t('fields.name')}</FieldLabel>
            <FieldContent>
              <Input
                id="auth-name"
                type="text"
                autoComplete="name"
                placeholder={t('placeholders.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </FieldContent>
          </Field>
        )}

        {/* 이메일 */}
        <Field>
          <FieldLabel htmlFor="auth-email">{t('fields.email')}</FieldLabel>
          <FieldContent>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder={t('placeholders.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </FieldContent>
        </Field>

        {/* 비밀번호 */}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="auth-password">{t('fields.password')}</FieldLabel>
            {isLogin && (
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground ml-auto text-sm underline-offset-2 hover:underline"
              >
                비밀번호 찾기
              </a>
            )}
          </div>
          <FieldContent>
            <Input
              id="auth-password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={
                isLogin
                  ? t('placeholders.password')
                  : t('placeholders.passwordMin', { min: PASSWORD_MIN })
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </FieldContent>
        </Field>

        {/* 에러 */}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {/* 제출 버튼 */}
        <Field>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {credentialsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              t('actions.login')
            ) : (
              t('actions.signup')
            )}
          </Button>
        </Field>

        {/* 구분선 */}
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
          {t('orContinueWith')}
        </FieldSeparator>

        {/* Google 로그인 */}
        <Field>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {loadingGoogle ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image
                src={googleIcon as string}
                alt="Google"
                width={18}
                height={18}
                className="shrink-0"
              />
            )}
            {t('providers.google')}
          </Button>
        </Field>

        {/* 뷰 전환 */}
        <FieldDescription className="text-center">
          {isLogin ? (
            <>
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => switchView('signup')}
                className="underline underline-offset-4 hover:opacity-80"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="underline underline-offset-4 hover:opacity-80"
              >
                로그인
              </button>
            </>
          )}
        </FieldDescription>
      </FieldGroup>
    </form>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] overflow-hidden border-0 bg-transparent p-0 shadow-none md:max-w-3xl">
        <DialogTitle className="sr-only">{isLogin ? '로그인' : '회원가입'}</DialogTitle>
        <DialogDescription className="sr-only">
          {isLogin ? '이메일 또는 Google 계정으로 로그인하세요' : '이메일로 새 계정을 만드세요'}
        </DialogDescription>
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              {/* 폼 */}
              {formContent}

              {/* 이미지 패널 — 모바일에서 숨김 */}
              {!isMobile && (
                <div className="bg-muted relative hidden md:block">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-white p-8 text-black">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10 backdrop-blur-sm">
                      <Box className="h-7 w-7 text-black" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-black">Marketing Flow</h2>
                      <p className="mt-1 text-sm text-black/70">
                        AI 기반 마케팅 콘텐츠 자동화 플랫폼
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <FieldDescription className="px-6 text-center text-xs">
            계속 진행하면{' '}
            <Link href="#" className="underline underline-offset-4">
              이용약관
            </Link>
            과{' '}
            <Link href="#" className="underline underline-offset-4">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </FieldDescription>
        </div>
      </DialogContent>
    </Dialog>
  )
}

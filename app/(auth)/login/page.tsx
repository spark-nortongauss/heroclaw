'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signInWithPassword, signUpWithPassword } from '@/app/login/actions';

const initialState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? 'Working…' : label}
    </button>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [signInState, signInAction] = useFormState(signInWithPassword, initialState);
  const [signUpState, signUpAction] = useFormState(signUpWithPassword, initialState);
  const routeError = searchParams.get('error');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-semibold">Sign in to HeroClaw</h1>
      <p className="mt-2 text-sm text-gray-600">Only users with an @nortongauss.com email can access this app.</p>
      {routeError ? <p className="mt-2 text-sm text-red-600">{routeError}</p> : null}

      <form action={signInAction} className="mt-6 space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Sign in</h2>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@nortongauss.com"
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="w-full rounded-md border px-3 py-2"
        />
        {signInState?.error ? <p className="text-sm text-red-600">{signInState.error}</p> : null}
        <SubmitButton label="Sign in" />
      </form>

      <form action={signUpAction} className="mt-4 space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Create account</h2>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@nortongauss.com"
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          placeholder="New password"
          className="w-full rounded-md border px-3 py-2"
        />
        {signUpState?.error ? <p className="text-sm text-red-600">{signUpState.error}</p> : null}
        {signUpState?.success ? <p className="text-sm text-green-700">{signUpState.success}</p> : null}
        <SubmitButton label="Create account" />
      </form>
    </main>
  );
}

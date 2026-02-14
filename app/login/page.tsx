// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return (
    <Suspense fallback={null}>
      <LoginClient routeError={searchParams?.error ?? null} />
    </Suspense>
  );
}

// app/(auth)/login/page.tsx
import LoginClient from "./LoginClient";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  return <LoginClient routeError={searchParams?.error ?? null} />;
}

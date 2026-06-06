import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn appearance={{ variables: { colorPrimary: "#10b981" } }} />
    </main>
  );
}

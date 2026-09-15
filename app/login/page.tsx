"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      const { error } = await signUp.email({ name, email, password });
      if (error) return setError(error.message ?? "Sign up failed");
    } else {
      const { error } = await signIn.email({ email, password });
      if (error) return setError(error.message ?? "Login failed");
    }
    router.push("/");
  }

  async function github() {
    await signIn.social({ provider: "github", callbackURL: "/" });
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-2xl font-bold">{mode === "login" ? "Log in" : "Sign up"}</h1>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border p-2"
          />
        )}
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border p-2"
        />
        <input
          required
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border p-2"
        />
        <button className="rounded bg-black p-2 text-white">
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <button onClick={github} className="mt-3 w-full rounded border p-2">
        Continue with GitHub
      </button>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 text-sm underline"
      >
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
      </button>

      {error && <p className="mt-3 text-red-600">{error}</p>}
      <p className="mt-6"><Link href="/" className="text-sm underline">Back home</Link></p>
    </main>
  );
}

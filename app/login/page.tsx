"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth-client";
import SiteHeader from "@/components/SiteHeader";

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
    <main className="page-wrap max-w-md">
      <SiteHeader />

      <h1 className="heading mt-12">
        {mode === "login" ? "Welcome back" : "Join Ragaforge"}
      </h1>
      <p className="subtle mt-2">
        {mode === "login"
          ? "Sign in to compose, publish, and like tracks."
          : "An account lets you compose and publish tracks."}
      </p>

      <form onSubmit={submit} className="card mt-8 flex flex-col gap-4 p-6">
        {mode === "signup" && (
          <label className="flex flex-col gap-2">
            <span className="label">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="label">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Password</span>
          <input
            required
            type="password"
            placeholder="8 characters minimum"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        <button className="btn-primary">
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <button onClick={github} className="btn-ghost mt-4 w-full">
        Continue with GitHub
      </button>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="nav-link mt-5"
      >
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
      </button>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <p className="mt-8">
        <Link href="/" className="nav-link">Back home</Link>
      </p>
    </main>
  );
}

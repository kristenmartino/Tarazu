"use client";
import { GuestAuthProvider } from "../../src/components/AuthProvider";
import { ThemeProvider } from "../../src/ThemeProvider";
import App from "../../src/App";

// Always guest, including when the visitor has an existing signed-in session.
export default function DemoPage() {
  return <ThemeProvider><GuestAuthProvider demo><App guestDemo /></GuestAuthProvider></ThemeProvider>;
}

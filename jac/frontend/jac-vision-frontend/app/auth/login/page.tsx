import LoginPage from "@/modules/users/pages/login-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Task Manager",
  description: "Login to your Task Manager account",
};

export default function Login() {
  return <LoginPage />;
}

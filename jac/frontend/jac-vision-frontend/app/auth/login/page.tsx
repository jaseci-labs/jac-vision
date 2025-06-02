import LoginPage from "@/modules/users/pages/login-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Jac Vision",
  description: "Login to your Jac Vision account",
};

export default function Login() {
  return <LoginPage />;
}

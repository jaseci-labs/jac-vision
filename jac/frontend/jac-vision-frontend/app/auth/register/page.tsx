import RegisterPage from "@/modules/users/pages/register-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Jac Vision",
  description: "Create a new Jac Vision account",
};

export default function Register() {
  return <RegisterPage />;
}

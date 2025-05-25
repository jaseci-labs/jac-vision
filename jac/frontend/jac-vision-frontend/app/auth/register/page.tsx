import RegisterPage from "@/modules/users/pages/register-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | Task Manager",
  description: "Create a new Task Manager account",
};

export default function Register() {
  return <RegisterPage />;
}

import { AuthLeftCol } from "@/ds/molecules/auth-left-col";
import { LoginForm } from "@/ds/organisms/login-form";
import { TwoColumnTemplate } from "@/ds/templates/two-column-template";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Task Manager",
  description: "Login to your Task Manager account",
};

export default function LoginPage() {
  return (
    <TwoColumnTemplate
      rightColumn={<LoginForm />}
      leftColumn={<AuthLeftCol />}
    />
  );
}

import LoginPage from "@/modules/users/pages/login-page";
import ProfilePage from "@/modules/users/pages/profile-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile | Task Manager",
  description: "Manage your Task Manager profile",
};

export default function Profile() {
  return <ProfilePage />;
}

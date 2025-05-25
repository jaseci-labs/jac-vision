import { useState } from "react";
import { useAuth } from "@/modules/users/hooks/use-auth";
import { useAppDispatch } from "@/store/useStore";

export function useProfile() {
  const dispatch = useAppDispatch();
  const { change_password, data: user } = useAuth();
  
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.email || ""); 
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    dispatch(change_password(currentPassword, newPassword));
  };

  return {
    email,
    setEmail,
    name,
    setName,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    
    handleProfileSubmit,
    handlePasswordSubmit,
  };
}
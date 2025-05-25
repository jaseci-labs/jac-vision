"use client";

import useAppNavigation from "@/_core/hooks/useAppNavigation";
import { useEffect, useCallback } from "react";
import { AuthService } from "../auth-service";
import { useAppDispatch, useAppSelector } from "@/store/useStore";
import {
  setUser,
  resetSuccess,
  setLoading,
  setInitialCheckComplete,
} from "@/store/userSlice";
import {
  changePassword,
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
} from "../userActions";

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.users);
  const router = useAppNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      dispatch(setLoading(true));
      const currentUser = AuthService.getCurrentUser();
      dispatch(setUser(currentUser));
      dispatch(setLoading(false));
      dispatch(setInitialCheckComplete(true));
    };
    checkAuth();
  }, [dispatch]);

  useEffect(() => {
    if (user.success) {
      if (user.successMessage === "Login successful") {
        router.navigate("/");
      } else if (user.successMessage === "Registration successful") {
        router.navigate("/auth/login");
      } else if (user.successMessage === "Logout successful") {
        router.navigate("/auth/login");
      }
      dispatch(resetSuccess());
    }
  }, [user.success, user.successMessage, router, dispatch]);

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(loginUser({ email, password }));
    },
    [dispatch]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      console.log("registering");
      dispatch(registerUser({ email, password }));
    },
    [dispatch]
  );

  const change_password = useCallback(
    async (oldPassword: string, newPassword: string) => {
      dispatch(changePassword({ oldPassword, newPassword }));
    },
    [dispatch]
  );

  const forgot_password = useCallback(
    async (email: string) => {
      dispatch(forgotPassword(email));
    },
    [dispatch]
  );

  const reset_password = useCallback(
    async (token: string, password: string) => {
      dispatch(resetPassword({ token, password }));
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    dispatch(logoutUser());
  }, [dispatch]);

  return {
    login,
    register,
    logout,
    isLoading: user.isLoading,
    error: user.error,
    data: user.user,
    success: user.success,
    successMessage: user.successMessage,
    change_password,
    forgot_password,
    reset_password,
    isAuthenticated: !!user.user,
    initialCheckComplete: user.initialCheckComplete,
  };
}

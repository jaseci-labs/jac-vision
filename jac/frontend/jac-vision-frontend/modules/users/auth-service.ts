import { UserNode } from "@/nodes/user-node";
import { public_api } from "../../_core/api-client";
import { localStorageUtil } from "@/_core/utils";
import { APP_KEYS } from "@/_core/keys";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {}

interface AuthResponse {
  token: string;
  user: UserNode;
}

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await public_api.post("/user/login", credentials);

    if (response.data.token) {
      localStorageUtil.setItem(APP_KEYS.TOKEN, response.data.token);
      localStorageUtil.setItem(APP_KEYS.USER, response.data.user);
    }

    return response.data.user;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await public_api.post("/user/register", data);

    if (response.data.token) {
      localStorageUtil.setItem(APP_KEYS.TOKEN, response.data.token);
    }

    return response.data;
  },

  logout: async (): Promise<void> => {
    localStorageUtil.removeItem(APP_KEYS.TOKEN);
    localStorageUtil.removeItem(APP_KEYS.USER);
  },

  changePassword: async (
    oldPassword: string,
    newPassword: string
  ): Promise<void> => {
    await public_api.post("/user/change_password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await public_api.post("/user/forgot_password", { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await public_api.post("/user/reset_password", { code: token, password });
  },

  getCurrentUser: (): UserNode | null => {
    const token = localStorageUtil.getItem(APP_KEYS.TOKEN);
    const user = localStorageUtil.getItem(APP_KEYS.USER);
    if (!token || !user) {
      return null;
    }

    return {
      id: "",
      email: "",
      root_id: "",
      is_activated: false,
      is_admin: false,
      expiration: 0,
      state: "",
    };
  },
};

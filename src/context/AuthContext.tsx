import { createContext, ReactNode, useEffect, useState } from "react";
import { parseCookies, setCookie } from "nookies";
import Router from "next/router";
import { api } from "../services/api";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();
  const isAuthenticated = !!user;

  //preencher dados do header para todas as requisições
  useEffect(() => {
    const { "nextauth.token": token } = parseCookies();

    if (token) {
      api.get("/me").then((response) => {
        const { email, permissions, roles } = response.data;

        setUser({ email, permissions, roles });
      });
    }
  }, []);

  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, "nextauth.token", token, {
        maxAge: 60 * 60 * 30, //30 Days  //Obs: browser não precisa ter a responsabilidade de remover token se expirar. Isso é responsabilidade do back-end
        path: "/", // Utilizando "/" qualquer endereço tem acesso ao cookie
      });

      setCookie(undefined, "nextauth.refreshToken", refreshToken, {
        maxAge: 60 * 60 * 30,
        path: "/",
      });

      setUser({
        email,
        permissions,
        roles,
      });

      //Atualizar token do header de authorizarion
      api.defaults.headers['Authorization'] = `Bearer ${token}`

      Router.push("/dashboard");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}

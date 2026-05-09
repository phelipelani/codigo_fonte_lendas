// Arquivo: src/features/auth/api/useLogin.ts
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";

import api from "@/api"; // Nosso cliente Axios centralizado
import { useAuthStore } from "@/store/useAuthStore";
import { Usuario } from "@/@types";
import { LoginSchema } from "@/utils/schemas";
import { getApiErrorMessage } from "@/utils/errorHandling";

// 1. Define o que a API do backend espera
type LoginPayload = Zod.infer<typeof LoginSchema>;

// 2. Define o que a API do backend retorna
type LoginResponse = {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string | null;
    role: "admin" | "user";
    fotoUrl: string | null;
    jogadorId: number | null;
  };
};

// 3. A função que realmente chama a API
const loginUser = async (credentials: LoginPayload): Promise<LoginResponse> => {
  const { data } = await api.post("/auth/login", credentials);
  return data;
};
export const useGoogleCallbackToken = () => {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);

  const processToken = (token: string) => {
    try {
      // Decodifica o payload do JWT (sem verificar assinatura — só para ler os dados)
      const payload = JSON.parse(atob(token.split(".")[1]));

      const user: Usuario = {
        id: payload.userId,
        name: payload.username,
        email: null,
        role: payload.role,
        fotoUrl: null,
        jogadorId: payload.jogadorId ?? null,
        jogador_id: payload.jogadorId ?? null,
      };

      loginAction(token, user);
      navigate("/", { replace: true });
    } catch (e) {
      if (import.meta.env.DEV) console.error("Erro ao processar token Google:", e);
      navigate("/login?error=google_failed", { replace: true });
    }
  };

  return { processToken };
};

// 4. O Hook (a "mágica" do React Query)
export const useLogin = () => {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);

  return useMutation<
    LoginResponse,
    AxiosError<{ message: string }>,
    LoginPayload
  >({
    mutationFn: loginUser,
    onSuccess: (data) => {
      const user: Usuario = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        fotoUrl: data.user.fotoUrl,
        jogadorId: data.user.jogadorId ?? null,
        jogador_id: data.user.jogadorId ?? null,
      };
      loginAction(data.token, user);
      navigate("/");
    },
    onError: (error) => {
      // O hook 'useToast' lidará com a exibição da mensagem de erro
      if (import.meta.env.DEV) console.error("Falha no login:", getApiErrorMessage(error, "Erro desconhecido"));
    },
  });
};

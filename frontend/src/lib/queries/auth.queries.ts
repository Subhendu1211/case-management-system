import { useMutation, useQuery } from "@tanstack/react-query";
import { api, publicApi } from "../api";
import type { AuthLoginResult, AuthLoginSuccess, User } from "../types";
import { getAccessToken, setTokens } from "../auth";

export function useMe() {
  const hasAccessToken = Boolean(getAccessToken());
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ user: User }>("GET", "/auth/me"),
    enabled: hasAccessToken,
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: {
      identifier: string;
      password: string;
      captcha?: { id: string; solution: string };
    }) =>
      publicApi<AuthLoginResult>(
        "POST",
        "/auth/login",
        input,
      ),
  });
}

export function useVerifyLoginOtp() {
  return useMutation({
    mutationFn: (input: { otpRequestId: string; otp: string }) =>
      publicApi<AuthLoginSuccess>("POST", "/auth/login/verify-otp", input),
    onSuccess: (data) => {
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: any) =>
      publicApi<{ accessToken: string; refreshToken: string; user: User }>(
        "POST",
        "/auth/register",
        input,
      ),
    onSuccess: (data) => {
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: {
      identifier: string;
      captcha: { id: string; solution: string };
    }) =>
      publicApi<{
        resetRequestId: string;
        channel: "EMAIL" | "SMS";
        recipientHint: string;
        message: string;
      }>("POST", "/auth/forgot-password", {
        identifier: input.identifier,
        captcha: input.captcha,
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: {
      resetRequestId: string;
      otp: string;
      password: string;
      confirmPassword: string;
    }) =>
      publicApi<{ message: string }>("POST", "/auth/reset-password", input),
  });
}

export function useCaptcha() {
  return useQuery({
    queryKey: ["captcha"],
    queryFn: () =>
      publicApi<{ id: string; image: string }>("GET", "/auth/captcha"),
    refetchOnWindowFocus: false,
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: (input: { idToken: string }) =>
      publicApi<{ accessToken: string; refreshToken: string; user: User }>(
        "POST",
        "/auth/google",
        input,
      ),
    onSuccess: (data) => {
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    },
  });
}

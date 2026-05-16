import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "../components/Input";
import {
  useLogin,
  useMe,
  useCaptcha,
  useVerifyLoginOtp,
} from "../lib/queries/auth.queries";
import { roleHome } from "../lib/auth";
import { AuthLayout } from "../components/layout/AuthLayout";
import { t, useLang } from "../i18n";

export function LoginPage() {
  useLang();
  const nav = useNavigate();
  const me = useMe();
  const login = useLogin();
  const verifyLoginOtp = useVerifyLoginOtp();
  const captchaQuery = useCaptcha();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [captchaSolution, setCaptchaSolution] = useState("");

  const isFormComplete = useMemo(() => {
    return Boolean(
      identifier.trim() &&
        password.trim() &&
        captchaSolution.trim() &&
        captchaQuery.data?.id,
    );
  }, [identifier, password, captchaSolution, captchaQuery.data?.id]);
  const disabled = useMemo(
    () => login.isPending || !isFormComplete,
    [login.isPending, isFormComplete],
  );

  useEffect(() => {
    if (me.data?.user) {
      nav(roleHome(me.data.user.role), { replace: true });
    }
  }, [me.data, nav]);

  const handleSubmit = async () => {
    if (!isFormComplete || !captchaQuery.data?.id) return;
    try {
      const result = await login.mutateAsync({
        identifier,
        password,
        captcha: {
          id: captchaQuery.data.id,
          solution: captchaSolution,
        },
      });
      if ("requiresOtp" in result && result.requiresOtp) {
        const otp = window.prompt(result.message || "Enter OTP");
        if (!otp) return;
        const verified = await verifyLoginOtp.mutateAsync({
          otpRequestId: result.otpRequestId,
          otp: otp.trim(),
        });
        nav(roleHome(verified.user.role));
        return;
      }
      throw new Error("OTP verification is required to login.");
    } catch {
      captchaQuery.refetch();
      setCaptchaSolution("");
    }
  };

  return (
    <AuthLayout
      title={t("auth.staffLogin.title")}
      subtitle={t("auth.staffLogin.subtitle")}
      variant="split"
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          await handleSubmit();
        }}
      >
        {/* Staff badge */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
          <svg
            className="h-4 w-4 flex-shrink-0 text-emerald-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs font-medium text-emerald-800">
            {t("auth.staffLogin.badge")}
          </span>
        </div>

        {/* Identifier field */}
        <Input
          label={t("auth.staffLogin.identifierLabel")}
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t("auth.staffLogin.identifierPlaceholder")}
          autoComplete="username"
        />

        {/* Password field with forgot link */}
        <div>
          <Input
            label={t("auth.staffLogin.passwordLabel")}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.staffLogin.passwordPlaceholder")}
            autoComplete="current-password"
          />
          <div className="mt-1.5 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-gov-blue transition-colors hover:text-gov-blue-dark hover:underline"
            >
              {t("auth.staffLogin.forgotPassword")}
            </Link>
          </div>
        </div>

        {/* CAPTCHA Section */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg
              className="h-3.5 w-3.5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {t("auth.staffLogin.securityVerification")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 flex-1 select-none items-center justify-center overflow-hidden rounded border border-neutral-300 bg-white px-2"
              dangerouslySetInnerHTML={{
                __html: captchaQuery.data?.image || t("auth.staffLogin.captchaLoading"),
              }}
            />
            <button
              type="button"
              onClick={() => captchaQuery.refetch()}
              className="rounded-lg border border-neutral-200 bg-white p-2.5 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-gov-blue"
              title={t("auth.staffLogin.captchaRefresh")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>
          <div className="mt-2.5">
            <input
              value={captchaSolution}
              onChange={(e) => setCaptchaSolution(e.target.value)}
              placeholder={t("auth.staffLogin.captchaPlaceholder")}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Error alert */}
        {login.error ? (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 flex-shrink-0 text-red-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{(login.error as any).message ?? t("auth.staffLogin.loginError")}</span>
          </div>
        ) : null}

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-800 disabled:opacity-60"
        >
          {login.isPending ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t("auth.staffLogin.signingIn")}
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                />
              </svg>
              {t("auth.staffLogin.signIn")}
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

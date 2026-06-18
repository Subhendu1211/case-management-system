import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useCaptcha,
  useForgotPassword,
  useResetPassword,
} from "../../lib/queries/auth.queries";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { t, useLang } from "../../i18n";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-\s]{6,20}$/;

type RecoveryStep = "request" | "verify";

export function ForgotPasswordPage() {
  useLang();
  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();
  const captchaQuery = useCaptcha();
  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [captchaSolution, setCaptchaSolution] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetRequestId, setResetRequestId] = useState("");
  const [submittedIdentifier, setSubmittedIdentifier] = useState("");
  const [deliveryHint, setDeliveryHint] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestDisabled = useMemo(
    () => forgotPassword.isPending,
    [forgotPassword.isPending],
  );
  const resetDisabled = useMemo(
    () => resetPassword.isPending,
    [resetPassword.isPending],
  );
  const emailValue = email.trim();
  const phoneValue = phone.trim();
  const hasEmail = emailValue.length > 0;
  const hasPhone = phoneValue.length > 0;
  const emailValid = !hasEmail || emailPattern.test(emailValue);
  const phoneValid = !hasPhone || phonePattern.test(phoneValue);
  const canRequestSubmit =
    (hasEmail || hasPhone) &&
    emailValid &&
    phoneValid &&
    !!captchaSolution.trim() &&
    !!captchaQuery.data?.id &&
    !requestDisabled;
  const canResetSubmit =
    !!resetRequestId &&
    !!otp.trim() &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    !resetDisabled;
  const selectedIdentifier = hasEmail ? emailValue : phoneValue;

  const handleRequest = async () => {
    if (!captchaQuery.data?.id) return;
    if (!hasEmail && !hasPhone) {
      setFormError(t("auth.forgotPassword.formErrorMissing"));
      return;
    }
    try {
      const response = await forgotPassword.mutateAsync({
        identifier: selectedIdentifier,
        captcha: {
          id: captchaQuery.data.id,
          solution: captchaSolution,
        },
      });
      setResetRequestId(response.resetRequestId);
      setSubmittedIdentifier(selectedIdentifier);
      setDeliveryHint(response.recipientHint);
      setNotice(response.message);
      setFormError(null);
      setCaptchaSolution("");
      setStep("verify");
    } catch {
      captchaQuery.refetch();
      setCaptchaSolution("");
    }
  };

  const handleReset = async () => {
    if (!resetRequestId) return;
    if (password !== confirmPassword) {
      setFormError(t("auth.forgotPassword.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setFormError(t("auth.forgotPassword.passwordMin"));
      return;
    }

    try {
      const response = await resetPassword.mutateAsync({
        resetRequestId,
        otp: otp.trim(),
        password,
        confirmPassword,
      });
      setNotice(response.message);
      setFormError(null);
      setSuccess(true);
    } catch {
      // Error is rendered from resetPassword.error.
    }
  };

  const resetToRequest = () => {
    setStep("request");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setResetRequestId("");
    setNotice(null);
    setFormError(null);
    captchaQuery.refetch();
  };

  return (
    <AuthLayout
      title={t("auth.forgotPassword.title")}
      subtitle={t("auth.forgotPassword.subtitle")}
      variant="split"
    >
      {success ? (
        <div className="flex flex-col items-center gap-5 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-8 w-8 text-emerald-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">
              {t("auth.forgotPassword.successTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-700">
              {t("auth.forgotPassword.successMessage")}
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
            style={{ background: "rgb(var(--color-gov-blue))" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgb(var(--color-gov-blue-dark))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                "rgb(var(--color-gov-blue))";
            }}
          >
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
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            {t("auth.forgotPassword.returnToSignIn")}
          </Link>
        </div>
      ) : (
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (step === "request") {
              await handleRequest();
              return;
            }
            await handleReset();
          }}
        >
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-800">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <span>
              {step === "request"
                ? t("auth.forgotPassword.infoNotice")
                : t("auth.forgotPassword.verifyNotice", {
                    identifier: deliveryHint || submittedIdentifier,
                  })}
            </span>
          </div>

          {step === "request" ? (
            <>
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t("auth.forgotPassword.emailLabel")}
                  <span className="text-semantic-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                  }}
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
                  autoComplete="email"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                />
                {!emailValid ? (
                  <p className="mt-1 text-xs text-red-600">
                    {t("auth.forgotPassword.emailInvalid")}
                  </p>
                ) : null}
              </div>

              <div className="text-center text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {t("auth.forgotPassword.or")}
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t("auth.forgotPassword.phoneLabel")}
                  <span className="text-semantic-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFormError(null);
                  }}
                  placeholder={t("auth.forgotPassword.phonePlaceholder")}
                  autoComplete="tel"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                />
                {!phoneValid ? (
                  <p className="mt-1 text-xs text-red-600">
                    {t("auth.forgotPassword.phoneInvalid")}
                  </p>
                ) : null}
              </div>

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
                    {t("auth.forgotPassword.securityVerification")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 flex-1 select-none items-center justify-center overflow-hidden rounded border border-neutral-300 bg-white px-2"
                    dangerouslySetInnerHTML={{
                      __html:
                        captchaQuery.data?.image ||
                        t("auth.forgotPassword.captchaLoading"),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => captchaQuery.refetch()}
                    className="rounded-lg border border-neutral-200 bg-white p-2.5 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-gov-blue"
                    title={t("auth.forgotPassword.captchaRefresh")}
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
                    onChange={(e) => {
                      setCaptchaSolution(e.target.value);
                      setFormError(null);
                    }}
                    placeholder={t("auth.forgotPassword.captchaPlaceholder")}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                    autoComplete="off"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-neutral-700">
                <p className="font-semibold text-neutral-900">
                  {t("auth.forgotPassword.otpSentTitle")}
                </p>
                <p className="mt-1">{deliveryHint || submittedIdentifier}</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t("auth.forgotPassword.otpLabel")}
                  <span className="text-semantic-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setFormError(null);
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t("auth.forgotPassword.otpPlaceholder")}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t("auth.forgotPassword.passwordLabel")}
                  <span className="text-semantic-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder={t("auth.forgotPassword.passwordPlaceholder")}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t("auth.forgotPassword.confirmPasswordLabel")}
                  <span className="text-semantic-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFormError(null);
                  }}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder={t("auth.forgotPassword.confirmPasswordPlaceholder")}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                />
              </div>
            </>
          )}

          {formError ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <span>{formError}</span>
            </div>
          ) : null}

          {forgotPassword.error && step === "request" ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <span>{(forgotPassword.error as any).message}</span>
            </div>
          ) : null}

          {resetPassword.error && step === "verify" ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
              <span>{(resetPassword.error as any).message}</span>
            </div>
          ) : null}

          {notice ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700">
              <span>{notice}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={step === "request" ? !canRequestSubmit : !canResetSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "rgb(var(--color-gov-blue))" }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              if (!btn.disabled)
                btn.style.background = "rgb(var(--color-gov-blue-dark))";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              if (!btn.disabled)
                btn.style.background = "rgb(var(--color-gov-blue))";
            }}
          >
            {(step === "request" && requestDisabled) ||
            (step === "verify" && resetDisabled) ? (
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
                {step === "request"
                  ? t("auth.forgotPassword.sending")
                  : t("auth.forgotPassword.updating")}
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
                  {step === "request" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5A2.25 2.25 0 0019.5 19.5v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  )}
                </svg>
                {step === "request"
                  ? t("auth.forgotPassword.submit")
                  : t("auth.forgotPassword.resetSubmit")}
              </>
            )}
          </button>

          <div className="border-t border-neutral-100 pt-3 text-center">
            {step === "verify" ? (
              <button
                type="button"
                onClick={resetToRequest}
                className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-gov-blue transition-colors hover:text-gov-blue-dark"
              >
                {t("auth.forgotPassword.requestNewOtp")}
              </button>
            ) : null}
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-gov-blue"
              >
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
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                {t("auth.forgotPassword.backToSignIn")}
              </Link>
            </div>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

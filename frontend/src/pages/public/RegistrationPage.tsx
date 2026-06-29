import { useMemo, useState } from "react";
import { Input } from "../../components/Input";
import { useRegister } from "../../lib/queries/auth.queries";
import { districts } from "../../lib/constants/districts";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { t, useLang } from "../../i18n";
import { validatePasswordPolicy } from "../../lib/passwordPolicy";

function SectionHeader({
  step,
  title,
  icon,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
        style={{ background: "rgb(var(--color-gov-blue))" }}
      >
        {step}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">{icon}</span>
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgb(var(--color-gov-blue))" }}
        >
          {title}
        </span>
      </div>
      <div className="flex-1 border-t border-neutral-200" />
    </div>
  );
}

export function RegistrationPage() {
  useLang();
  const navigate = useNavigate();
  const register = useRegister();
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    address: "",
    policeStation: "",
    block: "",
    pincode: "",
    district: districts[0] ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const disabled = useMemo(() => register.isPending, [register.isPending]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("auth.register.errors.nameRequired");
    if (!form.email.trim()) next.email = t("auth.register.errors.emailRequired");
    if (!form.mobile.trim()) next.mobile = t("auth.register.errors.mobileRequired");
    if (!form.password) next.password = t("auth.register.errors.passwordRequired");
    else if (validatePasswordPolicy(form.password))
      next.password = t("auth.register.errors.passwordMin");
    if (form.password !== form.confirmPassword)
      next.confirmPassword = t("auth.register.errors.passwordMismatch");
    if (!form.address.trim()) next.address = t("auth.register.errors.addressRequired");
    if (!form.policeStation.trim())
      next.policeStation = t("auth.register.errors.policeStationRequired");
    if (!form.block.trim()) next.block = t("auth.register.errors.blockRequired");
    if (!form.pincode.trim()) next.pincode = t("auth.register.errors.pincodeRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      await register.mutateAsync({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        confirmPassword: form.confirmPassword,
        address: form.address,
        policeStation: form.policeStation,
        block: form.block,
        pincode: form.pincode,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setErrors({
        form: err?.message ?? t("auth.register.errors.formError"),
      });
    }
  };

  return (
    <AuthLayout
      title={t("auth.register.title")}
      variant="centered"
    >
      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        {/* ── Section 1: Personal Information ── */}
        <div>
          <SectionHeader
            step={1}
            title={t("auth.register.sectionPersonal")}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("auth.register.fullNameLabel")}
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              error={errors.name}
              placeholder={t("auth.register.fullNamePlaceholder")}
            />
            <Input
              label={t("auth.register.emailLabel")}
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              error={errors.email}
              placeholder={t("auth.register.emailPlaceholder")}
            />
            <div className="sm:col-span-2 sm:max-w-xs">
              <Input
                label={t("auth.register.mobileLabel")}
                required
                value={form.mobile}
                onChange={(e) => updateField("mobile", e.target.value)}
                error={errors.mobile}
                placeholder={t("auth.register.mobilePlaceholder")}
                maxLength={10}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Password ── */}
        <div>
          <SectionHeader
            step={2}
            title={t("auth.register.sectionPassword")}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("auth.register.passwordLabel")}
              type="password"
              required
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              error={errors.password}
              placeholder={t("auth.register.passwordPlaceholder")}
              autoComplete="new-password"
            />
            <Input
              label={t("auth.register.confirmPasswordLabel")}
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
              autoComplete="new-password"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            {t("auth.register.passwordHint")}
          </p>
        </div>

        {/* ── Section 3: Address Details ── */}
        <div>
          <SectionHeader
            step={3}
            title={t("auth.register.sectionAddress")}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            }
          />
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{
              background: "rgb(var(--color-gov-blue) / 0.03)",
              borderColor: "rgb(var(--color-gov-blue) / 0.15)",
            }}
          >
            {/* Full Address */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                {t("auth.register.addressLabel")}
                <span className="text-semantic-danger" aria-hidden="true">*</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20 min-h-[80px] resize-none"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder={t("auth.register.addressPlaceholder")}
              />
              {errors.address && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-semantic-danger" role="alert">
                  <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.address}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* District */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t("auth.register.districtLabel")}
                </label>
                <select
                  value={form.district}
                  onChange={(e) => updateField("district", e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-all hover:border-neutral-400 focus:border-gov-blue focus:ring-2 focus:ring-gov-blue/20"
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label={t("auth.register.policeStationLabel")}
                required
                value={form.policeStation}
                onChange={(e) => updateField("policeStation", e.target.value)}
                error={errors.policeStation}
                placeholder={t("auth.register.policeStationPlaceholder")}
              />
              <Input
                label={t("auth.register.blockLabel")}
                required
                value={form.block}
                onChange={(e) => updateField("block", e.target.value)}
                error={errors.block}
                placeholder={t("auth.register.blockPlaceholder")}
              />
              <Input
                label={t("auth.register.pincodeLabel")}
                required
                value={form.pincode}
                onChange={(e) => updateField("pincode", e.target.value)}
                error={errors.pincode}
                placeholder={t("auth.register.pincodePlaceholder")}
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Form-level error */}
        {errors.form && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{errors.form}</span>
          </div>
        )}

        {/* Terms notice */}
        <p className="text-xs text-neutral-400 leading-relaxed">
          {t("auth.register.terms.prefix")}{" "}
          <a href="#" className="text-gov-blue underline-offset-2 hover:underline">
            {t("auth.register.terms.termsOfService")}
          </a>{" "}
          {t("auth.register.terms.and")}{" "}
          <a href="#" className="text-gov-blue underline-offset-2 hover:underline">
            {t("auth.register.terms.privacyPolicy")}
          </a>{" "}
          {t("auth.register.terms.suffix")}
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60"
          style={{ background: "rgb(var(--color-gov-blue))" }}
          onMouseEnter={(e) => {
            if (!disabled)
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgb(var(--color-gov-blue-dark))";
          }}
          onMouseLeave={(e) => {
            if (!disabled)
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgb(var(--color-gov-blue))";
          }}
        >
          {disabled ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t("auth.register.registering")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0112 21c-2.278 0-4.413-.64-6.228-1.765z" />
              </svg>
              {t("auth.register.submit")}
            </>
          )}
        </button>

        <div className="border-t border-neutral-100 pt-3 text-center text-sm">
          <span className="text-neutral-500">{t("auth.register.alreadyRegistered")} </span>
          <Link
            to="/login"
            className="font-semibold text-gov-blue transition-colors hover:text-gov-blue-dark hover:underline"
          >
            {t("auth.register.signInHere")}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { setLang, t, tArray, useLang } from "../../i18n";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  variant?: "split" | "centered";
  showRegisterLink?: boolean;
  showHeaderRow?: boolean;
  titleClassName?: string;
}

function OdishaLogo({ className }: { className?: string }) {
  return (
    <img
      src="/odisha-logo.png"
      alt="Government of Odisha Seal"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

function TricolorBar() {
  return (
    <div className="flex h-1 w-full overflow-hidden rounded-full">
      <div className="flex-1 bg-gov-saffron" />
      <div className="flex-1 bg-neutral-0" />
      <div className="flex-1 bg-emerald-700" />
    </div>
  );
}

function GovBrandingBlock() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
        <OdishaLogo className="h-16 w-16 text-gov-blue" />
      </div>
      <div>
        <div
          className="text-base font-bold uppercase tracking-widest leading-snug sm:text-lg lg:text-xl"
          style={{ color: "rgb(var(--color-gov-gold-light))" }}
        >
          {t("authLayout.brandingTitle")}
        </div>
       
      </div>
    </div>
  );
}

function LanguageToggle({ lang }: { lang: "en" | "or" }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
          lang === "en"
            ? "border-gov-blue bg-gov-blue text-white"
            : "border-neutral-300 bg-white text-neutral-600 hover:border-gov-blue hover:text-gov-blue"
        }`}
      >
        {t("authLayout.lang.en")}
      </button>
      <button
        type="button"
        onClick={() => setLang("or")}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
          lang === "or"
            ? "border-gov-blue bg-gov-blue text-white"
            : "border-neutral-300 bg-white text-neutral-600 hover:border-gov-blue hover:text-gov-blue"
        }`}
      >
        {t("authLayout.lang.or")}
      </button>
    </div>
  );
}

export function AuthLayout({
  children,
  title,
  subtitle,
  variant = "split",
  showRegisterLink = false,
  showHeaderRow = true,
  titleClassName,
}: AuthLayoutProps) {
  const lang = useLang();
  const systemTitleLines = t("authLayout.systemTitle").split("\n");
  /* ─── CENTERED VARIANT ─────────────────────────────────────── */
  if (variant === "centered") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center p-4 font-sans sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgb(var(--color-gov-blue)) 0%, rgb(15 36 105) 100%)",
        }}
      >
        {/* Top tricolor accent */}
        <div className="mb-6 w-full max-w-2xl">
          <TricolorBar />
        </div>

        <div className="mb-3 flex w-full max-w-2xl justify-end">
          <LanguageToggle lang={lang} />
        </div>

        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Card header */}
          <div
            className="px-8 py-5"
            style={{ background: "rgb(var(--color-gov-blue))" }}
          >
            <GovBrandingBlock />
            <div className="mt-4">
              <TricolorBar />
            </div>
          </div>

          {/* Card body */}
          <div className="px-8 py-8">
            {(title || subtitle) && (
              <div className="mb-7 border-l-4 pl-4" style={{ borderColor: "rgb(var(--color-gov-gold-light))" }}>
                {title && (
                  <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
                )}
              </div>
            )}
            {children}
          </div>

          {/* Card footer */}
          <div className="border-t border-neutral-200 bg-neutral-50 px-8 py-3 text-center text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} {t("authLayout.cardFooter.rights")} &nbsp;|&nbsp;
            {t("authLayout.cardFooter.allRights")} &nbsp;|&nbsp;
            <a href="#" className="hover:text-gov-blue hover:underline">
              {t("authLayout.cardFooter.privacy")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ─── SPLIT VARIANT (DEFAULT) ──────────────────────────────── */
  return (
    <div className="flex min-h-screen flex-col font-sans md:flex-row">
      {/* ── LEFT PANEL ── */}
      <div
        className="relative hidden w-full flex-col overflow-hidden md:flex md:w-1/2 lg:w-1/2"
        style={{ background: "rgb(var(--color-gov-blue))" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-5"
          style={{ background: "white" }}
        />
        <div
          className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full opacity-5"
          style={{ background: "white" }}
        />
        <div
          className="absolute right-0 top-0 h-px w-full opacity-20"
          style={{ background: "rgb(var(--color-gov-gold-light))" }}
        />

        {/* Gold right-edge accent */}
        <div
          className="absolute bottom-0 right-0 top-0 w-0.5 opacity-50"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgb(var(--color-gov-gold-light)), transparent)",
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10">
          {/* Top Section */}
          <div>
            {/* Tricolor bar at top */}
            <div className="mb-8">
              <TricolorBar />
            </div>

            <GovBrandingBlock />

            {/* System Title */}
            <h1 className="text-4xl font-extrabold leading-tight text-white lg:text-5xl">
              {systemTitleLines.map((line, idx) => (
                <span key={`${line}-${idx}`}>
                  {line}
                  {idx < systemTitleLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </h1>

            {/* Feature highlights */}
            <div className="mt-10 space-y-3">
              {tArray("authLayout.features").map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border"
                    style={{
                      borderColor: "rgb(var(--color-gov-gold-light) / 0.4)",
                      background: "rgb(var(--color-gov-gold-light) / 0.1)",
                    }}
                  >
                    <svg
                      className="h-3 w-3"
                      style={{ color: "rgb(var(--color-gov-gold-light))" }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div>
            <div className="mb-4 h-px bg-white/10" />
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} {t("authLayout.footer.rights")}
            </p>
            <div className="mt-2 flex gap-4">
              <a href="#" className="text-xs text-white/40 transition-colors hover:text-white/70">
                {t("authLayout.footer.terms")}
              </a>
              <a href="#" className="text-xs text-white/40 transition-colors hover:text-white/70">
                {t("authLayout.footer.privacy")}
              </a>
              <a href="#" className="text-xs text-white/40 transition-colors hover:text-white/70">
                {t("authLayout.footer.help")}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex w-full flex-col md:w-1/2 lg:w-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgb(var(--color-neutral-50)) 0%, rgb(var(--color-neutral-100)) 100%)",
        }}
      >
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-5 py-4 md:hidden"
          style={{ background: "rgb(var(--color-gov-blue))" }}
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white">
            <OdishaLogo className="h-9 w-9 text-gov-blue" />
          </div>
          <div>
            <div
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "rgb(var(--color-gov-gold-light))" }}
            >
              {t("authLayout.mobile.gov")}
            </div>
            <div className="text-xs text-white/80">{t("authLayout.mobile.system")}</div>
          </div>
        </div>
        {/* Mobile tricolor bar */}
        <div className="md:hidden">
          <TricolorBar />
        </div>

        {/* Language switch */}
        <div className="flex w-full items-center justify-end px-6 pt-4 md:pt-5">
          <LanguageToggle lang={lang} />
        </div>

        {/* Main form area (positioned toward top instead of vertically centered) */}
        <div className="flex flex-1 flex-col items-start justify-start px-0 pt-9 pb-8 sm:px-0 sm:pt-12">
          <div className="w-full rounded-2xl border border-neutral-200/80 bg-white/95 p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-10">
            {/* Portal breadcrumb (desktop) with optional register link on the right */}
            {showHeaderRow ? (
              <div className="mb-9 hidden items-center gap-3 text-sm text-neutral-500 md:flex md:justify-between">
                <div className="flex items-center gap-3">
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
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span className="font-medium text-neutral-400">
                    {t("authLayout.portal.label")}
                  </span>
                  <span className="text-neutral-300">/</span>
                  <span className="font-semibold text-neutral-700">
                    {title ?? t("authLayout.portal.secure")}
                  </span>
                </div>

                {showRegisterLink ? (
                  <div>
                    <Link
                      to="/register"
                      aria-label={t("authLayout.actions.newRegistration")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gov-blue px-5 py-2.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-gov-blue-dark"
                      style={{ minWidth: 220 }}
                    >
                      {t("authLayout.actions.newRegistration")}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {(title || subtitle) && (
              <div
                className="mb-9 border-l-4 pl-5"
                style={{ borderColor: "rgb(var(--color-gov-blue))" }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    {title && (
                      <h2 className={`font-bold leading-tight text-neutral-900 ${titleClassName ?? "text-3xl sm:text-4xl"}`}>
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="mt-2 text-lg text-neutral-600">{subtitle}</p>
                    )}
                  </div>

                  {showRegisterLink && !showHeaderRow ? (
                    <Link
                      to="/register"
                      aria-label={t("authLayout.actions.newRegistration")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gov-blue px-5 py-2.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-gov-blue-dark md:mt-1"
                      style={{ minWidth: 220 }}
                    >
                      {t("authLayout.actions.newRegistration")}
                    </Link>
                  ) : null}
                </div>
              </div>
            )}

            {children}
          </div>
        </div>

        {/* Bottom info strip */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-6 py-4 text-sm text-neutral-500">
          <span>{t("authLayout.bottomStrip.status")}</span>
          <span className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
            {t("authLayout.bottomStrip.ssl")}
          </span>
        </div>
      </div>
    </div>
  );
}

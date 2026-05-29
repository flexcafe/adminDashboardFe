import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import flexUsedLogo from "@/assets/flex-used-logo.png";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from
    ?.pathname;

  if (isAuthenticated && user) {
    return <Navigate to={from || "/fraud-reports"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    try {
      await login(identifier.trim(), password);
      navigate(from || "/fraud-reports", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("login.errorFallback");
      setLocalError(message);
    }
  };

  return (
    <section className="authPage">
      <div className="authCard authCardSimple">
        <div className="authHero">
          <div className="authHeroInner">
            <div className="loadingOrbits" aria-hidden="true">
              <div className="loadingOrbit loadingOrbitOuter">
                <span className="loadingOrbitDot loadingOrbitDotOuter" />
              </div>
              <div className="loadingOrbit loadingOrbitMiddle">
                <span className="loadingOrbitDot loadingOrbitDotMiddle" />
              </div>
              <div className="loadingOrbit loadingOrbitInner">
                <span className="loadingOrbitDot loadingOrbitDotInner" />
              </div>
              <span className="loadingParticle loadingParticleOne" />
              <span className="loadingParticle loadingParticleTwo" />
              <span className="loadingParticle loadingParticleThree" />
              <span className="loadingParticle loadingParticleFour" />
            </div>
            <div className="loadingLogoWrap authLogoWrap">
              <img className="loadingLogo authBrandLogo" src={flexUsedLogo} alt="Flex Used Market logo" />
            </div>
          </div>
        </div>
        <h1 className="authTitle">{t("login.title")}</h1>
        <p className="authSubtitle">{t("login.subtitle")}</p>

        <form className="authForm" onSubmit={handleSubmit}>
          <label className="authLabel" htmlFor="identifier">
            {t("login.identifierLabel")}
          </label>
          <input
            id="identifier"
            className="authInput"
            type="text"
            autoComplete="username"
            placeholder={t("login.identifierPlaceholder")}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />

          <label className="authLabel" htmlFor="password">
            {t("login.passwordLabel")}
          </label>
          <input
            id="password"
            className="authInput"
            type="password"
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {(localError || error) && <p className="authError">{localError || error}</p>}

          <button className="btn authSubmit" type="submit" disabled={isLoading}>
            {isLoading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
      </div>
    </section>
  );
}

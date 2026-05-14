import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import flexUsedLogo from "@/assets/flex-used-logo.png";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated, isLoading, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from
    ?.pathname;

  if (isAuthenticated && user) {
    return <Navigate to={from || "/dashboard"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    try {
      await login(identifier.trim(), password);
      navigate(from || "/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
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
        <h1 className="authTitle">Admin Login</h1>
        <p className="authSubtitle">
          Sign in to the Flex Used Market dashboard with your phone/email and password.
        </p>

        <form className="authForm" onSubmit={handleSubmit}>
          <label className="authLabel" htmlFor="identifier">
            Phone or Email
          </label>
          <input
            id="identifier"
            className="authInput"
            type="text"
            autoComplete="username"
            placeholder="Enter your phone or email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />

          <label className="authLabel" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="authInput"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {(localError || error) && (
            <p className="authError">{localError || error}</p>
          )}

          <button className="btn authSubmit" type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        </div>
    </section>
  );
}

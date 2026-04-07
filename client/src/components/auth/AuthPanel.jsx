import { useState } from "react";

const initialForm = {
  username: "",
  email: "",
  password: "",
  emailOrUsername: "",
  country: "",
  region: "",
};

export default function AuthPanel({ mode, onModeChange, onSubmit, isSubmitting, feedback }) {
  const [form, setForm] = useState(initialForm);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (mode === "signup") {
      onSubmit({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        country: form.country.trim(),
        region: form.region.trim(),
      });
      return;
    }

    onSubmit({
      emailOrUsername: form.emailOrUsername.trim(),
      password: form.password,
    });
  }

  return (
    <section className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">Full Game Platform</p>
        <h1>Konnect4</h1>
        <p className="hero-text">
          Sign in to challenge friends, jump into random matchmaking, or practice against
          PrinceLegitTV.
        </p>
      </div>

      <div className="toggle-row">
        <button
          type="button"
          className={`tab-button ${mode === "signup" ? "active" : ""}`}
          onClick={() => onModeChange("signup")}
        >
          Sign up
        </button>
        <button
          type="button"
          className={`tab-button ${mode === "login" ? "active" : ""}`}
          onClick={() => onModeChange("login")}
        >
          Log in
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                value={form.username}
                maxLength="18"
                placeholder="Choose a username"
                onChange={(event) => updateField("username", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                placeholder="you@example.com"
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Country</span>
                <input
                  type="text"
                  value={form.country}
                  placeholder="Optional"
                  onChange={(event) => updateField("country", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Region</span>
                <input
                  type="text"
                  value={form.region}
                  placeholder="Optional"
                  onChange={(event) => updateField("region", event.target.value)}
                />
              </label>
            </div>
          </>
        ) : (
          <label className="field">
            <span>Email or username</span>
            <input
              type="text"
              value={form.emailOrUsername}
              placeholder="Enter your email or username"
              onChange={(event) => updateField("emailOrUsername", event.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            placeholder="At least 8 characters"
            onChange={(event) => updateField("password", event.target.value)}
          />
        </label>

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>

      <div className="status-banner">
        <strong>{mode === "signup" ? "Create your profile" : "Welcome back"}</strong>
        <p>{feedback.message}</p>
      </div>
    </section>
  );
}

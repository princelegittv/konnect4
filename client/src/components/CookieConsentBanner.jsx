export default function CookieConsentBanner({ onAccept }) {
  return (
    <aside className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-banner-copy">
        <strong>Essential cookies required</strong>
        <p>
          Konnect4 uses secure session cookies for login, matchmaking, live matches, and cross-device
          play in browsers.
        </p>
      </div>

      <button type="button" className="primary-button" onClick={onAccept}>
        Accept cookies
      </button>
    </aside>
  );
}

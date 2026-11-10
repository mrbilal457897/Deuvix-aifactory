import Image from "next/image";
import type { Thumbnail } from "@/lib/live-work/types";
import { SITE_URL } from "@/lib/seo";
import "@/app/live-work.css";

/** Hostname of the configured site origin — the default URL pill label. */
const DEFAULT_HOST = new URL(SITE_URL).hostname;

/** A bare host is never useful as a pill; localhost-family values are too. */
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

/** Reduce any stored URL-ish value to a bare hostname for the decorative window pill. */
function pillHost(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return DEFAULT_HOST;
  try {
    const host = new URL(raw).hostname.trim();
    return host && !LOCAL_HOST.test(host) ? host : DEFAULT_HOST;
  } catch {
    const bare = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0].trim();
    return bare && !LOCAL_HOST.test(bare) ? bare : DEFAULT_HOST;
  }
}

/**
 * The MacBook + phone + floating glass chip stage.
 *
 * Shared by the public `ProjectBlock` and the admin's live preview so the
 * preview is literally the same component the site renders — there is no second
 * copy of the device markup to drift out of sync.
 *
 * Screenshots come from the admin (`desktopThumbnail` / `mobileThumbnail`).
 * A missing desktop shot renders a neutral skeleton; a missing phone shot
 * renders the static Deuvix mobile-page mock below.
 */

/** Desktop shots are 16:10, phone shots 9:19.2 — both reserve their box. */
const DESKTOP_SIZES = "(max-width: 960px) 88vw, 42vw";
const PHONE_SIZES = "(max-width: 960px) 30vw, 15vw";

function Shot({
  image,
  sizes,
  priority = false,
  className = "",
}: {
  image: Thumbnail | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!image?.url) {
    return <div className={`lw-skeleton ${className}`.trim()} aria-hidden="true" />;
  }
  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`lw-shot-img ${className}`.trim()}
    />
  );
}

/**
 * Fallback for when no mobile thumbnail is uploaded: a static mock of the
 * Deuvix mobile page. Colours come from the same tokens as everything else;
 * it is decorative (aria-hidden) and never interactive.
 */
function PhoneMock() {
  return (
    <div className="lw-mock" aria-hidden="true">
      <div className="lw-mock-nav">
        <span className="lw-mock-logo">Deuvix</span>
        <span className="lw-mock-burger">☰</span>
      </div>
      <span className="lw-mock-badge">
        <span className="lw-mock-dot" />
        Now accepting clients
      </span>
      <p className="lw-mock-headline">Build your AI workforce, unit by unit.</p>
      <p className="lw-mock-copy">
        We design, manufacture, and deploy Digital FTEs — AI workers built to run production
        lines, not demos.
      </p>
      <span className="lw-mock-btn">Book a Call →</span>
      <div className="lw-mock-card">
        <p className="lw-mock-card-label">FTE-004 · Running</p>
        <p className="lw-mock-card-number">312</p>
        <p className="lw-mock-card-caption">Leads handled this week</p>
      </div>
    </div>
  );
}

export interface DeviceStageProps {
  desktop: Thumbnail | null;
  mobile: Thumbnail | null;
  browserUrlLabel?: string;
  chipTitle?: string;
  chipSubtitle?: string;
  /** Preview-only flip: context left, devices right (the site never uses it). */
  mirrored?: boolean;
  /** Only the first block preloads; everything else lazy-loads. */
  priority?: boolean;
  /** Negative seconds so neighbouring chips never bob in sync. */
  chipDelay?: number;
}

export function DeviceStage({
  desktop,
  mobile,
  browserUrlLabel,
  chipTitle,
  chipSubtitle,
  mirrored = false,
  priority = false,
  chipDelay = 0,
}: DeviceStageProps) {
  const showChip = Boolean(chipTitle || chipSubtitle);

  return (
    <div className={`lw-stage${mirrored ? " lw-stage-mirrored" : ""}`}>
      {/* MacBook — screen only, no keyboard base. */}
      <div className="lw-mac">
        <div className="lw-mac-lid">
          <div className="lw-mac-screen">
            <div className="lw-winbar" aria-hidden="true">
              <span className="lw-winbar-dot" style={{ background: "#ff5f57" }} />
              <span className="lw-winbar-dot" style={{ background: "#febc2e" }} />
              <span className="lw-winbar-dot" style={{ background: "#28c840" }} />
              <span className="lw-winbar-url">{pillHost(browserUrlLabel)}</span>
            </div>
            <div className="lw-shot lw-shot-desktop">
              <Shot image={desktop} sizes={DESKTOP_SIZES} priority={priority} />
            </div>
          </div>
        </div>
      </div>

      {/* Phone — slim dark frame, tilted like a product render. */}
      <div className="lw-phone">
        <div className="lw-phone-screen">
          <div className="lw-phone-body">
            <span className="lw-phone-island" aria-hidden="true" />
            {mobile?.url ? (
              <Image
                src={mobile.url}
                alt={mobile.alt}
                fill
                sizes={PHONE_SIZES}
                priority={priority}
                className="lw-shot-img"
              />
            ) : (
              <PhoneMock />
            )}
          </div>
        </div>
      </div>

      {showChip && (
        <div
          className="lw-chip"
          aria-hidden="true"
          style={chipDelay ? { animationDelay: `${chipDelay}s` } : undefined}
        >
          <span className="lw-chip-icon">✓</span>
          <span className="lw-chip-copy">
            {chipTitle && <span className="lw-chip-title">{chipTitle}</span>}
            {chipSubtitle && <span className="lw-chip-sub">{chipSubtitle}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

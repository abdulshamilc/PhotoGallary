// ============================================================
// SITE CONFIGURATION — Edit this file to customize the gallery
// for each new couple / event. No other files need to change.
// ============================================================

const siteConfig = {
  // ----------------------------------------------------------
  // 1. Couple & Event Identity
  // ----------------------------------------------------------

  /** First person's name */
  person1: 'Person One',

  /** Second person's name */
  person2: 'Person Two',

  /**
   * Full couple display name shown in headings.
   * Defaults to "{person1} & {person2}" — override if needed.
   */
  get coupleNames() {
    return `${this.person1} & ${this.person2}`;
  },

  /** Event type label shown beneath the couple names */
  eventType: 'Wedding Celebration',

  /**
   * Full event title (used in hero heading and page titles).
   * Defaults to "{coupleNames} {eventType}"
   */
  get eventTitle() {
    return `${this.coupleNames} ${this.eventType}`;
  },

  /** Short badge label (e.g. "The Holy Union", "The Reception") */
  eventBadge: 'The Holy Union',

  /** One-line description shown in the hero subtitle */
  heroSubtitle:
    'Two souls, one timeless journey. Explore and download our cherished moments captured in original high resolution.',

  /** Decorative quote shown at the bottom of the login page */
  loginQuote: 'Celebrating a Lifetime of Love & Harmony',

  /** Footer copyright tagline */
  footerTagline: 'Every Moment, Forever. Preserved in Original Quality.',

  // ----------------------------------------------------------
  // 2. Background Images
  //    Paths are relative to the /public folder.
  //    Set to null or '' to remove a background entirely.
  // ----------------------------------------------------------

  /** Hero section background image */
  heroBgImage: '/background1.jpg',

  /** Admin login page background image */
  adminBgImage: '/background2.jpg',

  /** Access-code entry page background image */
  accessCodeBgImage: '/Background3.JPG',
};

export default siteConfig;


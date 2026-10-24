// Existing public business contact on kristenmartino.ai. No workspace content
// is attached automatically; visitors choose what to include in their email.
export const CONTACT_EMAIL = "kristen@kristenmartino.ai";
export const contactHref = subject => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

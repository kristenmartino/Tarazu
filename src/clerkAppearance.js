// Clerk appearance, derived from the LIVE palette (concrete hexes, so Clerk's
// internal color math keeps working — unlike var() refs). Callers pass the
// active palette from useC():
//   const C = useC(); <ClerkProvider appearance={clerkAppearance(C)} />
// In-app (under <ThemeProvider>) this tracks the active theme; on the auth pages
// (no provider) useC() returns the default palette, so the front door stays on
// the default brand. Used by the in-app ClerkWrapper AND the /sign-in & /sign-up
// ClerkAuthProvider. (NB palette↔token naming: C.blue is the brand brass.)
export const clerkAppearance = (C) => ({
  variables: {
    colorPrimary: C.blue,             // brand brass
    colorBackground: C.surface,
    colorInputBackground: C.surfaceSunken,
    colorText: C.text,
    colorTextSecondary: C.textMuted,
    colorInputText: C.text,
    colorNeutral: C.text,
    colorDanger: C.danger,
    colorSuccess: C.success,
    colorWarning: C.warn,
    borderRadius: "8px",
    fontFamily: "var(--body)",        // the real Figtree (next/font) via the token
  },
  elements: {
    card: { backgroundColor: C.surface, borderColor: C.border },
    headerTitle: { color: C.text },
    headerSubtitle: { color: C.textMuted },
    socialButtonsBlockButton: { borderColor: C.border, color: C.text },
    dividerLine: { backgroundColor: C.border },
    dividerText: { color: C.textDim },
    formFieldLabel: { color: C.textMuted },
    formFieldInput: { backgroundColor: C.surfaceSunken, borderColor: C.border, color: C.text },
    formButtonPrimary: {
      backgroundColor: C.blue,
      color: C.textOnAccent,
      fontWeight: 700,
      "&:hover": { backgroundColor: C.accentHover },
      "&:active": { backgroundColor: C.accentPressed },
    },
    footerActionText: { color: C.textMuted },
    footerActionLink: { color: C.blue },
    // In-app <OrganizationSwitcher/> in the top bar (used at /app). Its trigger
    // sits beside the Pricing / RICE Guide links, so it borrows their muted
    // mono treatment instead of Clerk's default button styling.
    organizationSwitcherTrigger: {
      color: C.textMuted,
      fontFamily: "var(--mono)",
      fontSize: "11px",
      padding: "4px 8px",
      borderRadius: "6px",
      "&:hover": { backgroundColor: C.surfaceSunken, color: C.text },
    },
    organizationSwitcherPopoverCard: { backgroundColor: C.surface, borderColor: C.border },
    organizationSwitcherPopoverActionButton: { color: C.text },
    organizationSwitcherPopoverActionButtonText: { color: C.text },
    organizationSwitcherPopoverActionButtonIcon: { color: C.textMuted },
    organizationSwitcherPopoverFooter: { display: "none" },
    organizationPreviewMainIdentifier: { color: C.text },
    organizationPreviewSecondaryIdentifier: { color: C.textMuted },

    // In-app <UserButton/> popover (used at /app)
    userButtonPopoverCard: { backgroundColor: C.surface, borderColor: C.border },
    userButtonPopoverActionButton: { color: C.text },
    userButtonPopoverActionButtonText: { color: C.text },
    userButtonPopoverActionButtonIcon: { color: C.textMuted },
    userButtonPopoverFooter: { display: "none" },
  },
});

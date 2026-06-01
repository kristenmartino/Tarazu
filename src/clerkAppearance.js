// Shared brass Clerk appearance (dark "balance / precision-instrument" theme),
// aligned to the §2 semantic tokens (app/tokens.css). Hand-rolled via variables +
// elements so no new dependency (@clerk/themes) is required for a dark look.
//
// Used by the /sign-in & /sign-up front door AND the in-app ClerkWrapper.
export const clerkBrassAppearance = {
  variables: {
    colorPrimary: "#E2AC4D",          // --accent
    colorBackground: "#15171C",       // --surface-raised
    colorInputBackground: "#121316",  // --surface-sunken
    colorText: "#ECEAE4",             // --text-primary
    colorTextSecondary: "#A7A294",    // --text-secondary
    colorInputText: "#ECEAE4",
    colorNeutral: "#ECEAE4",
    colorDanger: "#E5675A",           // --danger
    colorSuccess: "#74D2A8",          // --success
    colorWarning: "#E89B3C",          // --warning
    borderRadius: "8px",
    fontFamily: "var(--body)",        // the real Figtree (next/font) via the token
  },
  elements: {
    card: { backgroundColor: "#15171C", borderColor: "rgba(236,234,228,0.11)" },
    headerTitle: { color: "#ECEAE4" },
    headerSubtitle: { color: "#A7A294" },
    socialButtonsBlockButton: { borderColor: "rgba(236,234,228,0.11)", color: "#ECEAE4" },
    dividerLine: { backgroundColor: "rgba(236,234,228,0.11)" },
    dividerText: { color: "#706B5F" },
    formFieldLabel: { color: "#A7A294" },
    formFieldInput: { backgroundColor: "#121316", borderColor: "rgba(236,234,228,0.11)", color: "#ECEAE4" },
    formButtonPrimary: {
      backgroundColor: "#E2AC4D",
      color: "#1A1406",
      fontWeight: 700,
      "&:hover": { backgroundColor: "#ECBB63" },   // --accent-hover
      "&:active": { backgroundColor: "#C8923A" },   // --accent-pressed
    },
    footerActionText: { color: "#A7A294" },
    footerActionLink: { color: "#E2AC4D" },
    // In-app <UserButton/> popover (used at /app)
    userButtonPopoverCard: { backgroundColor: "#15171C", borderColor: "rgba(236,234,228,0.11)" },
    userButtonPopoverActionButton: { color: "#ECEAE4" },
    userButtonPopoverActionButtonText: { color: "#ECEAE4" },
    userButtonPopoverActionButtonIcon: { color: "#A7A294" },
    userButtonPopoverFooter: { display: "none" },
  },
};

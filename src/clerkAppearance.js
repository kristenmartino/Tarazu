// Shared brass Clerk appearance (dark "balance / precision-instrument" theme).
//
// Phase 1: applied to the /sign-in & /sign-up front door so the first click
//          from the new landing lands on a matching dark-brass auth surface.
// Phase 2: apply this to the in-app ClerkWrapper too (its <UserButton/> etc.
//          still use the older blue appearance — see TARAZU_PHASE2_THEME_MIGRATION.md).
export const clerkBrassAppearance = {
  variables: {
    colorPrimary: "#E2AC4D",
    colorBackground: "#15171C",
    colorText: "#ECEAE4",
    colorTextSecondary: "#A7A294",
    colorInputBackground: "#0E0F12",
    colorInputText: "#ECEAE4",
    colorNeutral: "#ECEAE4",
    colorDanger: "#DF726A",
    colorSuccess: "#74D2A8",
    borderRadius: "10px",
    fontFamily: '"Figtree", system-ui, sans-serif',
  },
  elements: {
    card: { backgroundColor: "#15171C", borderColor: "rgba(236,234,228,0.11)" },
    headerTitle: { color: "#ECEAE4" },
    headerSubtitle: { color: "#A7A294" },
    socialButtonsBlockButton: { borderColor: "rgba(236,234,228,0.11)", color: "#ECEAE4" },
    dividerLine: { backgroundColor: "rgba(236,234,228,0.11)" },
    dividerText: { color: "#706B5F" },
    formFieldLabel: { color: "#A7A294" },
    formFieldInput: { backgroundColor: "#0E0F12", borderColor: "rgba(236,234,228,0.11)", color: "#ECEAE4" },
    formButtonPrimary: { backgroundColor: "#E2AC4D", color: "#1a1406", fontWeight: 700 },
    footerActionText: { color: "#A7A294" },
    footerActionLink: { color: "#E2AC4D" },
  },
};

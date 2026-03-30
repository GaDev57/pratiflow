export const BOOKING_THEMES = [
  { id: "default", name: "Nature", gradient: "linear-gradient(135deg, #667260 0%, #8B9D83 50%, #A3B18A 100%)", primary: "#667260" },
  { id: "ocean", name: "Océan", gradient: "linear-gradient(135deg, #1e3a5f 0%, #3b7dd8 50%, #6db3f2 100%)", primary: "#1e3a5f" },
  { id: "sunset", name: "Coucher de soleil", gradient: "linear-gradient(135deg, #c2185b 0%, #e65100 50%, #ff8f00 100%)", primary: "#c2185b" },
  { id: "lavender", name: "Lavande", gradient: "linear-gradient(135deg, #4a148c 0%, #7b1fa2 50%, #ba68c8 100%)", primary: "#4a148c" },
  { id: "earth", name: "Terre", gradient: "linear-gradient(135deg, #3e2723 0%, #795548 50%, #a1887f 100%)", primary: "#3e2723" },
  { id: "coral", name: "Corail", gradient: "linear-gradient(135deg, #b71c1c 0%, #e57373 50%, #ffcdd2 100%)", primary: "#b71c1c" },
  { id: "midnight", name: "Nuit", gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #415a77 100%)", primary: "#0d1b2a" },
  { id: "mint", name: "Menthe", gradient: "linear-gradient(135deg, #004d40 0%, #00897b 50%, #4db6ac 100%)", primary: "#004d40" },
] as const;

export type ThemeId = (typeof BOOKING_THEMES)[number]["id"];

export function getTheme(id: string) {
  return BOOKING_THEMES.find((t) => t.id === id) ?? BOOKING_THEMES[0];
}

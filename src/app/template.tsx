/**
 * Route transitions — subtle fade + 8px rise on every navigation.
 * Navbar and footer stay mounted (they live in the layout, not here).
 * transform/opacity only, so it never triggers layout work.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-transition">{children}</div>;
}

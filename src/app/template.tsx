export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-enter">
      <div
        aria-hidden="true"
        className="top-progress fixed top-0 left-0 z-[9998] h-0.5 w-full bg-primary/70 pointer-events-none"
      />
      {children}
    </div>
  );
}

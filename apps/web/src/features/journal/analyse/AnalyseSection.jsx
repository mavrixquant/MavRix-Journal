// apps/web/src/features/journal/analyse/AnalyseSection.jsx
//
// Two presentational primitives for the Analyse page:
//
//   <AnalyseSection num="01" title="Snapshot" note="42 trades">
//     …children…
//   </AnalyseSection>
//
//   <AnalysePanel title="Underwater Curve" note="Drawdown" height={320}>
//     <UnderwaterChart />
//   </AnalysePanel>
//
// Both are pure layout — all styling is provided by the <style> block in
// AnalysePage.jsx so the CSS ships exactly once per route, not once per
// section instance.
//
// `height="auto"` on AnalysePanel disables the fixed-height constraint,
// letting self-sizing content (tables, calendars, KPI grids) grow naturally.

export function AnalyseSection({ num, title, note, children }) {
  return (
    <section className="as-root">
      <div className="as-head">
        <span className="as-num">{num}</span>
        <h2 className="as-title">{title}</h2>
        <div className="as-rule" />
        {note && <span className="as-note">{note}</span>}
      </div>
      <div className="as-body">{children}</div>
    </section>
  );
}

export function AnalysePanel({ title, note, height = 320, children }) {
  const hasHeader = !!(title || note);
  return (
    <div className="as-panel">
      {hasHeader && (
        <div className="as-panel-head">
          {title && <span className="as-panel-title">{title}</span>}
          {note && <span className="as-panel-note">{note}</span>}
        </div>
      )}
      <div
        className="as-panel-body"
        style={height === 'auto' ? undefined : { height }}
      >
        {children}
      </div>
    </div>
  );
}
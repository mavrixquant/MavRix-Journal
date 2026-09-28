// apps/web/src/components/ui/panel-skeleton.jsx
//
// Shimmer placeholder shown while dashboard panels are loading.
// Matches the visual style of the panels they replace so the transition
// from skeleton → content is smooth.

export function PanelSkeleton({ rows = 3, showChart = false }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '14px 16px',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,.05)',
        }}
      >
        <Shimmer width="40%" height={12} />
        <Shimmer width={60} height={10} />
      </div>

      {/* Content rows */}
      {showChart ? (
        <Shimmer width="100%" height="100%" radius={12} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <Shimmer width={90} height={10} />
              <Shimmer flex={1} height={10} />
              <Shimmer width={60} height={10} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Shimmer({ width = '100%', height = 12, radius = 6, flex }) {
  return (
    <div
      style={{
        width,
        height,
        flex,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'panelShimmer 1.6s linear infinite',
      }}
    />
  );
}

// Inject the keyframe once. Safe to do multiple times — CSS dedupes identical rules.
if (typeof document !== 'undefined') {
  const STYLE_ID = 'panel-skeleton-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes panelShimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="panelShimmer"] { animation: none !important; }
      }
    `;
    document.head.appendChild(style);
  }
}
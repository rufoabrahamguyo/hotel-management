/** Lightweight chart primitives for the Pro-style dashboard (no chart library). */

export function MiniArea({ color = '#4da6ff', heights }) {
  const bars = heights ?? [12, 18, 14, 22, 28, 20, 32, 26, 30, 24, 34, 28, 36, 30, 22, 28, 32, 26, 20, 24];
  const max = Math.max(...bars, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 46, width: '100%' }}>
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(8, (h / max) * 100)}%`,
            borderRadius: '3px 3px 0 0',
            background: `linear-gradient(180deg, ${color} 0%, ${color}55 100%)`,
            opacity: 0.45 + (i / bars.length) * 0.55,
            minWidth: 4,
          }}
        />
      ))}
    </div>
  );
}

export function MiniBars({ color = '#4da6ff', heights }) {
  const bars = heights ?? [18, 28, 22, 34, 26, 38, 30, 24, 32, 28, 36, 22];
  const max = Math.max(...bars, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 46, width: '100%' }}>
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(10, (h / max) * 100)}%`,
            borderRadius: 2,
            background: i % 2 === 0 ? color : `${color}99`,
            minWidth: 6,
          }}
        />
      ))}
    </div>
  );
}

/** Grouped vertical bars for the main trend panel. */
export function TrendBarChart({ series = [], labels = [], colorA = '#91d5ff', colorB = '#1890ff' }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const n = labels.length || series[0]?.values?.length || 0;
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          height: 220,
          padding: '8px 4px 0',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: '100%' }}>
            {series.map((s, si) => {
              const v = s.values[i] ?? 0;
              const h = Math.max(4, (v / max) * 100);
              return (
                <div
                  key={si}
                  title={`${s.name}: ${v}`}
                  style={{
                    width: '38%',
                    maxWidth: 28,
                    height: `${h}%`,
                    borderRadius: '3px 3px 0 0',
                    background: si === 0 ? colorA : colorB,
                    transition: 'height .25s ease',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {labels.map((lab, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#8c8c8c' }}>
            {lab}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RankList({ items = [], emptyText = 'Nothing to rank yet.' }) {
  if (!items.length) {
    return <div style={{ color: '#8c8c8c', fontSize: 13, padding: '12px 0' }}>{emptyText}</div>;
  }
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {items.map((item, i) => {
        const rank = i + 1;
        const badgeBg = rank <= 3 ? '#314659' : '#f0f0f0';
        const badgeColor = rank <= 3 ? '#fff' : '#8c8c8c';
        return (
          <li key={item.key ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: badgeBg,
                color: badgeColor,
                fontSize: 12,
                fontWeight: 600,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {rank}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#595959', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            <span style={{ fontSize: 14, color: '#262626', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{item.value}</span>
          </li>
        );
      })}
    </ol>
  );
}

const STATUS_COLORS = ['#1890ff', '#52c41a', '#faad14', '#13c2c2', '#722ed1', '#eb2f96', '#8c8c8c', '#fa541c'];

/** Labeled vertical bars for categorical report data (room / reservation status). */
export function CategoryBarChart({ items = [], height = 220, emptyText = 'No data to chart.' }) {
  if (!items.length) {
    return <div style={{ color: '#8c8c8c', fontSize: 13, padding: '24px 0' }}>{emptyText}</div>;
  }
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
          height,
          padding: '8px 4px 0',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {items.map((item, i) => {
          const v = Number(item.value) || 0;
          const h = Math.max(v > 0 ? 8 : 2, (v / max) * 100);
          const color = item.color || STATUS_COLORS[i % STATUS_COLORS.length];
          return (
            <div key={item.key ?? item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#595959', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
              <div
                title={`${item.label}: ${v}`}
                style={{
                  width: '70%',
                  maxWidth: 48,
                  height: `${h}%`,
                  borderRadius: '4px 4px 0 0',
                  background: `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)`,
                  transition: 'height .25s ease',
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {items.map((item) => (
          <div
            key={`lab-${item.key ?? item.label}`}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              color: '#8c8c8c',
              textTransform: 'capitalize',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal stacked share bar for occupancy / mix. */
export function ShareBar({ segments = [], height = 14 }) {
  const total = segments.reduce((a, s) => a + (Number(s.value) || 0), 0) || 1;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', width: '100%', height, borderRadius: 6, overflow: 'hidden', background: '#f5f5f5' }}>
        {segments.map((s, i) => {
          const v = Number(s.value) || 0;
          if (v <= 0) return null;
          return (
            <div
              key={s.key ?? s.label}
              title={`${s.label}: ${v}`}
              style={{
                width: `${(v / total) * 100}%`,
                background: s.color || STATUS_COLORS[i % STATUS_COLORS.length],
                transition: 'width .25s ease',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
        {segments.map((s, i) => (
          <span key={`leg-${s.key ?? s.label}`} style={{ fontSize: 12, color: '#595959', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: s.color || STATUS_COLORS[i % STATUS_COLORS.length],
              }}
            />
            {s.label} ({Number(s.value) || 0})
          </span>
        ))}
      </div>
    </div>
  );
}

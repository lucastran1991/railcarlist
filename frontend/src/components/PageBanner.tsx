'use client';

type BannerVariant = 'electricity' | 'steam' | 'boiler' | 'substation' | 'tank' | 'pipeline';

const BANNER_CONFIG: Record<BannerVariant, {
  bg: string;
  gridStyle: React.CSSProperties;
  glowColor: string;
  glow2Color: string;
  tagColor: string;
  titleColor: string;
  accentColor: string;
  subColor: string;
  ruleGradient: string;
  tag: string;
  title: [string, string]; // [accent, rest]
  sub: string;
  badge?: { type: 'dots' | 'pill' | 'temp' | 'count' | 'warning' | 'flow'; content: string };
}> = {
  electricity: {
    bg: '#0b0f1a',
    gridStyle: { backgroundImage: 'linear-gradient(rgba(41,120,220,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(41,120,220,.18) 1px, transparent 1px)', backgroundSize: '40px 40px' },
    glowColor: 'rgba(30,100,255,.22)',
    glow2Color: 'rgba(20,60,180,.15)',
    tagColor: '#4a8fff',
    titleColor: '#e8f0ff',
    accentColor: '#3d8eff',
    subColor: 'rgba(130,170,255,.7)',
    ruleGradient: 'linear-gradient(90deg, #1a5fff, #4af0ff, #1a5fff)',
    tag: '// SYS.MODULE \u2014 001',
    title: ['Elec', 'tricity'],
    sub: 'Power \u00b7 Distribution \u00b7 Safety',
    badge: { type: 'dots', content: '' },
  },
  steam: {
    bg: '#07131a',
    gridStyle: { backgroundImage: 'linear-gradient(rgba(0,200,180,.12) 2px, transparent 2px), linear-gradient(90deg, rgba(0,200,180,.08) 1px, transparent 1px)', backgroundSize: '60px 60px' },
    glowColor: 'rgba(0,200,165,.2)',
    glow2Color: 'rgba(0,160,200,.15)',
    tagColor: '#00c8b0',
    titleColor: '#d8f5f0',
    accentColor: '#00e5c8',
    subColor: 'rgba(0,200,170,.6)',
    ruleGradient: 'linear-gradient(90deg, #00b8a0, #00ffe0, #00b8a0)',
    tag: '// SYS.MODULE \u2014 002',
    title: ['Ste', 'am'],
    sub: 'Pressure \u00b7 Flow \u00b7 Thermodynamics',
    badge: { type: 'pill', content: 'PRESSURIZED SYSTEM' },
  },
  boiler: {
    bg: '#120808',
    gridStyle: { backgroundImage: 'linear-gradient(rgba(220,70,20,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(220,70,20,.1) 1px, transparent 1px)', backgroundSize: '48px 48px' },
    glowColor: 'rgba(255,80,0,.28)',
    glow2Color: 'rgba(255,120,20,.15)',
    tagColor: '#ff6030',
    titleColor: '#ffe8da',
    accentColor: '#ff5520',
    subColor: 'rgba(255,130,80,.6)',
    ruleGradient: 'linear-gradient(90deg, #c83000, #ff8040, #c83000)',
    tag: '// SYS.MODULE \u2014 003',
    title: ['Boi', 'ler'],
    sub: 'Combustion \u00b7 Heat Transfer \u00b7 Control',
    badge: { type: 'temp', content: '185\u00b0' },
  },
  substation: {
    bg: '#0c0a18',
    gridStyle: { backgroundImage: 'radial-gradient(rgba(140,80,255,.25) 1px, transparent 1px)', backgroundSize: '32px 32px' },
    glowColor: 'rgba(100,40,240,.25)',
    glow2Color: 'rgba(80,20,200,.2)',
    tagColor: '#a070ff',
    titleColor: '#ece8ff',
    accentColor: '#9060ff',
    subColor: 'rgba(160,120,255,.65)',
    ruleGradient: 'linear-gradient(90deg, #6020e0, #c090ff, #6020e0)',
    tag: '// SYS.MODULE \u2014 004',
    title: ['Sub', ' Station'],
    sub: 'HV \u00b7 Transformer \u00b7 Switchgear',
    badge: { type: 'pill', content: 'GRID ONLINE' },
  },
  tank: {
    bg: '#091210',
    gridStyle: { backgroundImage: 'linear-gradient(30deg, rgba(0,180,100,.1) 1px, transparent 1px), linear-gradient(150deg, rgba(0,180,100,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,100,.06) 1px, transparent 1px)', backgroundSize: '50px 50px' },
    glowColor: 'rgba(0,160,80,.2)',
    glow2Color: 'rgba(0,120,70,.18)',
    tagColor: '#30d080',
    titleColor: '#d8f5e8',
    accentColor: '#20c070',
    subColor: 'rgba(40,200,110,.6)',
    ruleGradient: 'linear-gradient(90deg, #009050, #40ffaa, #009050)',
    tag: '// SYS.MODULE \u2014 005',
    title: ['Ta', 'nks'],
    sub: 'Storage \u00b7 Level \u00b7 Containment',
    badge: { type: 'count', content: '59' },
  },
  pipeline: {
    bg: '#0f0f0a',
    gridStyle: { backgroundImage: 'linear-gradient(rgba(200,170,40,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(200,170,40,.08) 1px, transparent 1px)', backgroundSize: '56px 56px' },
    glowColor: 'rgba(180,140,0,.2)',
    glow2Color: 'rgba(140,110,0,.15)',
    tagColor: '#d4a820',
    titleColor: '#f8f0d0',
    accentColor: '#e8c030',
    subColor: 'rgba(210,170,40,.6)',
    ruleGradient: 'linear-gradient(90deg, #a07800, #f0d040, #a07800)',
    tag: '// SYS.MODULE \u2014 006',
    title: ['Pipe', 'line'],
    sub: 'Flow \u00b7 Routing \u00b7 Distribution',
    badge: { type: 'warning', content: 'ACTIVE FLOW' },
  },
};

function BadgeElement({ config }: { config: typeof BANNER_CONFIG.electricity }) {
  const b = config.badge;
  if (!b) return null;

  switch (b.type) {
    case 'dots':
      return (
        <div className="absolute top-5 right-8 flex gap-1.5 z-[15]">
          <span className="w-2 h-2 rounded-full" style={{ background: config.accentColor, boxShadow: `0 0 8px ${config.accentColor}` }} />
          <span className="w-2 h-2 rounded-full" style={{ background: config.accentColor, opacity: 0.25 }} />
          <span className="w-2 h-2 rounded-full" style={{ background: config.accentColor, opacity: 0.25 }} />
        </div>
      );
    case 'pill':
      return (
        <div className="absolute top-5 right-8 flex items-center gap-2.5 z-[15]">
          <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: config.accentColor, boxShadow: `0 0 6px ${config.accentColor}` }} />
          <span className="font-mono text-[10px] tracking-[0.15em] px-2.5 py-0.5 border" style={{ color: config.subColor, borderColor: `${config.accentColor}40` }}>
            {b.content}
          </span>
        </div>
      );
    case 'temp':
      return (
        <div className="absolute top-5 right-8 z-[15]">
          <div className="font-mono text-[28px] leading-none" style={{ color: config.tagColor }}>{b.content}</div>
          <div className="font-mono text-[11px]" style={{ color: `${config.tagColor}80` }}>CELSIUS</div>
        </div>
      );
    case 'count':
      return (
        <div className="absolute top-5 right-8 border flex flex-col items-center px-3.5 py-1.5 z-[15]" style={{ borderColor: `${config.accentColor}40` }}>
          <div className="font-mono text-[24px] leading-none" style={{ color: config.accentColor }}>{b.content}</div>
          <div className="font-mono text-[9px] tracking-[0.2em]" style={{ color: config.subColor }}>VESSELS</div>
        </div>
      );
    case 'warning':
      return (
        <div className="absolute top-0 right-0 z-[20] font-mono text-[10px] tracking-[0.2em] px-3.5 py-1" style={{ background: config.accentColor, color: config.bg, clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%)' }}>
          {b.content}
        </div>
      );
    default:
      return null;
  }
}

export default function PageBanner({ variant, children }: { variant: BannerVariant; children?: React.ReactNode }) {
  const c = BANNER_CONFIG[variant];

  return (
    <div className="w-full h-[140px] sm:h-[160px] relative overflow-hidden rounded-lg mb-4 sm:mb-6" style={{ background: c.bg }}>
      {/* Grid background */}
      <div className="absolute inset-0" style={c.gridStyle} />

      {/* Glow effects */}
      <div className="absolute w-[600px] h-[500px] -top-[200px] -right-[60px] rounded-full" style={{ background: `radial-gradient(ellipse, ${c.glowColor} 0%, transparent 65%)` }} />
      <div className="absolute w-[300px] h-[300px] -bottom-[80px] left-[80px] rounded-full" style={{ background: `radial-gradient(circle, ${c.glow2Color} 0%, transparent 70%)` }} />

      {/* Scanlines */}
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,.07) 3px, rgba(0,0,0,.07) 4px)' }} />

      {/* Badge */}
      <BadgeElement config={c} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end px-6 sm:px-10 pb-5 sm:pb-6 z-10">
        <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.25em] uppercase mb-1" style={{ color: c.tagColor }}>{c.tag}</div>
        <div className="text-4xl sm:text-5xl md:text-6xl font-black uppercase leading-[0.92] tracking-tight" style={{ color: c.titleColor }}>
          <span style={{ color: c.accentColor }}>{c.title[0]}</span>{c.title[1]}
        </div>
        <div className="font-mono text-[12px] sm:text-[14px] tracking-[0.18em] uppercase mt-2" style={{ color: c.subColor }}>{c.sub}</div>
      </div>

      {/* Bottom rule */}
      <div className="absolute bottom-0 left-0 right-0 h-1 z-20" style={{ background: c.ruleGradient }} />

      {/* Boiler warning stripe */}
      {variant === 'boiler' && (
        <div className="absolute top-0 left-0 right-0 h-[5px] z-20" style={{ background: 'repeating-linear-gradient(90deg, #ff6020 0px, #ff6020 20px, #1a0800 20px, #1a0800 40px)' }} />
      )}

      {children}
    </div>
  );
}

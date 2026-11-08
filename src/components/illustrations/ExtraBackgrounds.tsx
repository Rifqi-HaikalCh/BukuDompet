"use client";

/**
 * 16 latar baru untuk Butik (Versi 5.1) — 2 latar per fase pertumbuhan.
 * Kanvas 400×410, pet berdiri di y = 358. Tidak ada garis putus-putus siluet properti kosong.
 */
import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { Cloud, INK, K, Mote, Pine, SkyRect, Spark, fb, hash, linear, loop, polar, starPts } from "./cosmeticKit";

type BgProps = { uid: string };

const OUT = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: "round", strokeLinecap: "round" } as const;

/* ───────────────────────── FASE 1 ───────────────────────── */

function BgMeadowMorning({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#BFE9FF"], [70, "#FFF3D2"], [100, "#FFE9C2"]]} />
      <motion.circle cx={84} cy={78} r={58} fill="#FFF3A8" opacity={0.5} style={fb()} animate={{ scale: [0.94, 1.08, 0.94] }} transition={loop(4)} />
      <circle cx={84} cy={78} r={30} fill={K.honey} {...OUT} />
      <Cloud x={250} y={70} s={0.9} drift={18} dur={16} />
      <Cloud x={340} y={140} s={0.6} drift={12} dur={13} outline={false} fill="#FFFFFF" opacity={0.85} />
      <path d="M-10 262 Q80 226 170 258 Q250 230 330 256 Q380 242 410 258 V380 H-10Z" fill="#B5E889" {...OUT} />
      <path d="M-10 308 Q100 280 200 306 Q300 284 410 308 V410 H-10Z" fill={K.matchaSoft} {...OUT} />
      <rect x={0} y={336} width={400} height={74} fill="#7ED63A" />
      <path d="M0 336 Q100 328 200 336 Q300 344 400 336" fill="none" stroke="#A8E86A" strokeWidth={3} strokeLinecap="round" />
      {[40, 98, 300, 350, 150, 262].map((x, i) => (
        <motion.g key={x} style={fb(0.5, 1)} animate={{ rotate: [-6, 6, -6] }} transition={loop(2.8 + (i % 3) * 0.5, { delay: i * 0.3 })}>
          <path d={`M${x} 346 V${322 - (i % 3) * 6}`} stroke={K.matchaDark} strokeWidth={3} strokeLinecap="round" />
          <circle cx={x} cy={318 - (i % 3) * 6} r={6.5} fill={[K.peach, K.honey, K.taroSoft][i % 3]} {...OUT} strokeWidth={2} />
          <circle cx={x} cy={318 - (i % 3) * 6} r={2.2} fill={K.cream} />
        </motion.g>
      ))}
      <Mote x={150} y={230} d={0.4} />
      <Mote x={320} y={200} d={1.6} r={2} />
    </g>
  );
}

function BgRainyWindow({ uid }: BgProps) {
  return (
    <g>
      <defs>
        <clipPath id={`${uid}-win`}>
          <rect x={92} y={60} width={216} height={188} rx={14} />
        </clipPath>
        <radialGradient id={`${uid}-lamp`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={400} height={410} fill="#FFE3CC" />
      <g opacity={0.35} fill="#FFD0AE">
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={i * 40 + 12} y={0} width={14} height={338} />
        ))}
      </g>
      <rect x={84} y={52} width={232} height={204} rx={20} fill={K.wood} {...OUT} />
      <rect x={92} y={60} width={216} height={188} rx={14} fill="#9CB3C6" />
      <g clipPath={`url(#${uid}-win)`}>
        <rect x={92} y={60} width={216} height={110} fill="#8FA7BC" />
        <Cloud x={150} y={110} s={0.8} fill="#C9D4DE" outline={false} drift={14} dur={12} />
        <Cloud x={260} y={92} s={0.7} fill="#B7C5D2" outline={false} drift={10} dur={10} />
        <path d="M92 214 Q150 190 200 210 Q260 186 308 212 V248 H92Z" fill="#7FA68A" />
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.path
            key={i}
            d={`M${100 + (i % 8) * 28 + (i > 7 ? 14 : 0)} 66 l-5 14`}
            stroke={K.skySoft}
            strokeWidth={2.4}
            strokeLinecap="round"
            animate={{ y: [0, 190], opacity: [0, 1, 0] }}
            transition={linear(0.9 + hash(i + 9) * 0.5, { delay: hash(i + 30) * 1.2 })}
          />
        ))}
        {[130, 200, 262].map((x, i) => (
          <motion.path key={x} d={`M${x} 96 q3 10 0 18`} stroke={K.cream} strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.7} animate={{ y: [0, 100] }} transition={linear(3.4 + i, { delay: i * 0.9 })} />
        ))}
      </g>
      <path d="M200 60 V248 M92 154 H308" stroke={K.woodDark} strokeWidth={6} />
      <rect x={76} y={252} width={248} height={14} rx={6} fill={K.woodLight} {...OUT} />
      <g>
        <path d="M110 252 L114 226 H146 L150 252Z" fill={K.peach} {...OUT} />
        <path d="M118 226 Q112 200 126 196 Q130 210 130 226 M142 226 Q150 204 136 198" fill="none" stroke={K.matchaDark} strokeWidth={5} strokeLinecap="round" />
        <path d="M122 214 Q114 196 128 192 Q134 204 130 214Z M140 214 Q152 200 138 190Z" fill={K.matcha} {...OUT} strokeWidth={2} />
      </g>
      <g>
        <path d="M248 252 V230 Q248 224 254 224 H280 Q286 224 286 230 V252Z" fill={K.cream} {...OUT} />
        <path d="M286 232 Q300 232 300 242 Q300 250 286 250" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <motion.path key={i} d={`M${258 + i * 9} 218 q-5 -8 0 -16 q5 -8 0 -14`} fill="none" stroke={K.cream} strokeWidth={3} strokeLinecap="round" animate={{ opacity: [0, 0.9, 0], y: [0, -8] }} transition={loop(2.4, { delay: i * 0.5 })} />
        ))}
      </g>
      <circle cx={340} cy={96} r={70} fill={`url(#${uid}-lamp)`} />
      <rect x={0} y={338} width={400} height={72} fill="#D9A56B" />
      <g stroke={K.woodDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.7}>
        <path d="M0 362 H400 M0 386 H400 M60 338 V362 M180 338 V362 M300 338 V362 M120 362 V386 M240 362 V386 M360 362 V386 M30 386 V410 M150 386 V410 M270 386 V410" />
      </g>
      <rect x={-4} y={328} width={408} height={12} fill={K.woodLight} {...OUT} />
    </g>
  );
}

/* ───────────────────────── FASE 2 ───────────────────────── */

function BgBakery({ uid }: BgProps) {
  return (
    <g>
      <rect x={0} y={0} width={400} height={410} fill="#FFE7DA" />
      <defs>
        <pattern id={`${uid}-chk`} width={40} height={40} patternUnits="userSpaceOnUse">
          <rect width={40} height={40} fill="#FFF3EA" />
          <rect width={20} height={20} fill="#FFD9C8" />
          <rect x={20} y={20} width={20} height={20} fill="#FFD9C8" />
        </pattern>
      </defs>
      <rect x={0} y={150} width={400} height={190} fill={`url(#${uid}-chk)`} opacity={0.65} />
      <g>
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d={`M${i * 50} 0 H${i * 50 + 50} V52 Q${i * 50 + 25} 74 ${i * 50} 52Z`} fill={i % 2 ? K.cream : K.peach} {...OUT} strokeWidth={2.4} />
        ))}
      </g>
      <rect x={30} y={112} width={150} height={10} rx={4} fill={K.wood} {...OUT} />
      <rect x={30} y={178} width={150} height={10} rx={4} fill={K.wood} {...OUT} />
      <ellipse cx={62} cy={104} rx={22} ry={9} fill="#E8A857" {...OUT} />
      <ellipse cx={108} cy={103} rx={20} ry={10} fill="#F2BB6B" {...OUT} />
      <ellipse cx={152} cy={104} rx={18} ry={8} fill="#E8A857" {...OUT} />
      <path d="M44 172 q8 -16 24 0 q8 -12 22 0 Z" fill="#D6914A" {...OUT} strokeWidth={2.2} />
      <rect x={104} y={158} width={64} height={18} rx={9} fill="#E8A857" {...OUT} />
      <path d="M116 160 l8 14 M132 160 l8 14 M148 160 l8 14" stroke={INK} strokeWidth={2} opacity={0.4} />
      <g>
        <rect x={236} y={96} width={140} height={150} rx={14} fill="#8A6A58" {...OUT} />
        <rect x={250} y={110} width={112} height={104} rx={10} fill="#3F2E28" {...OUT} />
        <motion.rect x={254} y={114} width={104} height={96} rx={8} fill="#FF9A3C" animate={{ opacity: [0.55, 0.9, 0.55] }} transition={loop(1.8)} />
        <ellipse cx={288} cy={190} rx={20} ry={9} fill="#E8A857" {...OUT} strokeWidth={2} />
        <ellipse cx={334} cy={188} rx={18} ry={8} fill="#F2BB6B" {...OUT} strokeWidth={2} />
        <circle cx={270} cy={230} r={5} fill={K.honey} {...OUT} strokeWidth={2} />
        <circle cx={346} cy={230} r={5} fill={K.honey} {...OUT} strokeWidth={2} />
      </g>
      {[0, 1].map((i) => (
        <motion.path key={i} d={`M${300 + i * 36} 84 q-6 -10 0 -18 q6 -8 0 -16`} fill="none" stroke={K.cream} strokeWidth={4} strokeLinecap="round" animate={{ opacity: [0, 0.9, 0], y: [0, -10] }} transition={loop(2.6, { delay: i * 0.8 })} />
      ))}
      <rect x={0} y={338} width={400} height={72} fill="#F2C7A3" />
      <path d="M0 338 H400" stroke={INK} strokeWidth={2.6} />
      <rect x={20} y={300} width={130} height={40} rx={8} fill={K.woodLight} {...OUT} />
      <path d="M32 300 q10 -14 22 0 q12 -14 24 0 q12 -14 24 0 q12 -14 24 0" fill={K.peachSoft} {...OUT} strokeWidth={2.2} />
      <Mote x={190} y={220} d={0.6} color={K.cream} />
    </g>
  );
}

function Sunflower({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  return (
    <motion.g style={fb(0.5, 1)} animate={{ rotate: [-4, 4, -4] }} transition={loop(3.2, { delay: d })}>
      <g transform={`translate(${x} ${y}) scale(${s})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
        <path d="M0 0 V60" stroke={K.matchaDark} strokeWidth={5} strokeLinecap="round" />
        <path d="M0 40 Q-18 30 -22 44 Q-6 52 0 40Z" fill={K.matcha} {...OUT} strokeWidth={2} />
        {Array.from({ length: 12 }).map((_, i) => {
          const [px, py] = polar(0, 0, 17, i * 30);
          return <ellipse key={i} cx={px} cy={py} rx={9} ry={5} transform={`rotate(${i * 30} ${px} ${py})`} fill={K.honey} stroke={INK} strokeWidth={1.8} style={{ transformBox: "view-box", transformOrigin: "0 0" }} />;
        })}
        <circle r={12} fill="#8A5A2B" {...OUT} strokeWidth={2.2} />
        <circle cx={-3} cy={-3} r={2} fill="#B07A44" />
      </g>
    </motion.g>
  );
}

function BgSunflowerField({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#9FDCFF"], [60, "#FFE9A8"], [100, "#FFD58A"]]} />
      <motion.g style={fb()} animate={{ rotate: 360 }} transition={linear(60)}>
        <circle cx={320} cy={84} r={70} fill="none" stroke="none" />
        {Array.from({ length: 12 }).map((_, i) => {
          const [x1, y1] = polar(320, 84, 44, i * 30);
          const [x2, y2] = polar(320, 84, 64, i * 30);
          return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={K.honeySoft} strokeWidth={5} strokeLinecap="round" />;
        })}
      </motion.g>
      <circle cx={320} cy={84} r={34} fill={K.honey} {...OUT} />
      <Cloud x={110} y={80} s={0.8} drift={16} dur={15} />
      <path d="M-10 250 Q90 214 190 248 Q290 220 410 250 V360 H-10Z" fill="#A5DD6B" {...OUT} />
      <rect x={0} y={336} width={400} height={74} fill="#8CCB4F" />
      <Sunflower x={34} y={216} s={1.05} d={0} />
      <Sunflower x={92} y={246} s={0.8} d={0.6} />
      <Sunflower x={366} y={212} s={1.1} d={0.3} />
      <Sunflower x={308} y={250} s={0.78} d={0.9} />
      <Sunflower x={148} y={272} s={0.6} d={1.3} />
      <Sunflower x={258} y={276} s={0.6} d={0.2} />
      <motion.g animate={{ x: [0, 40, 0], y: [0, -14, 0] }} transition={loop(6)}>
        <ellipse cx={210} cy={170} rx={7} ry={5} fill={K.honey} {...OUT} strokeWidth={2} />
        <path d="M208 166 v8 M212 166 v8" stroke={INK} strokeWidth={2} />
        <ellipse cx={206} cy={163} rx={5} ry={3.4} fill={K.skySoft} opacity={0.85} stroke={INK} strokeWidth={1.4} />
      </motion.g>
      <Mote x={140} y={200} d={0.8} />
    </g>
  );
}

/* ───────────────────────── FASE 3 ───────────────────────── */

function BgPlayground({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#A8E0FF"], [100, "#E8F8FF"]]} />
      <Cloud x={90} y={64} s={0.8} drift={16} dur={14} />
      <Cloud x={320} y={96} s={0.65} drift={12} dur={12} />
      <path d="M-10 250 Q100 214 210 248 Q320 220 410 250 V360 H-10Z" fill="#B5E889" {...OUT} />
      <rect x={0} y={336} width={400} height={74} fill="#8EE04A" />
      <g>
        <path d="M296 340 V150 M348 340 V230" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d="M296 340 V150 M348 340 V230" stroke={K.peach} strokeWidth={5} strokeLinecap="round" />
        <path d="M296 150 H322 Q360 176 360 232 V240" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M296 150 H322 Q360 176 360 232 V240" fill="none" stroke={K.honey} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M296 192 H336 M296 232 H340" stroke={K.woodDark} strokeWidth={4} strokeLinecap="round" />
        <path d="M300 340 L306 190" stroke={K.skyDark} strokeWidth={4} strokeLinecap="round" />
      </g>
      <g>
        <path d="M44 340 V120 H168 V340" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 340 V120 H168 V340" fill="none" stroke={K.sky} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <motion.g style={fb(0.5, 0)} animate={{ rotate: [-18, 18, -18] }} transition={loop(2.4)}>
          <path d="M84 120 V256 M130 120 V256" stroke={INK} strokeWidth={3} />
          <rect x={76} y={256} width={62} height={10} rx={5} fill={K.peach} {...OUT} />
        </motion.g>
      </g>
      <ellipse cx={200} cy={372} rx={150} ry={20} fill="#F6DCA8" opacity={0.7} />
      <Spark x={240} y={190} size={6} color={K.cream} delay={0.4} />
      <Mote x={220} y={250} d={1.2} color={K.cream} />
    </g>
  );
}

function BgAquarium({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-water`} stops={[[0, "#6AD0FF"], [60, "#2E9BEA"], [100, "#1B6FC2"]]} />
      <g opacity={0.25}>
        <polygon points="60,0 110,0 190,336 120,336" fill={K.cream} />
        <polygon points="220,0 252,0 312,336 262,336" fill={K.cream} />
      </g>
      <rect x={0} y={330} width={400} height={80} fill="#F2D39B" />
      <path d="M0 330 Q100 322 200 330 Q300 338 400 330" fill="none" stroke="#E0BD7C" strokeWidth={3} />
      <g>
        <path d="M300 336 V270 H312 V250 H324 V270 H336 V336Z" fill={K.taroSoft} {...OUT} />
        <path d="M312 250 V232 H324 V250" fill={K.taro} {...OUT} strokeWidth={2.2} />
        <path d="M308 336 V300 Q320 288 332 300 V336Z" fill="#6E4FA0" />
      </g>
      {[44, 80, 350, 372].map((x, i) => (
        <motion.path key={x} d={`M${x} 336 Q${x - 10} 300 ${x} 270 Q${x + 10} 240 ${x} 214`} fill="none" stroke={i % 2 ? K.matcha : K.matchaDark} strokeWidth={7} strokeLinecap="round" style={fb(0.5, 1)} animate={{ rotate: [-5, 5, -5] }} transition={loop(3 + i * 0.4)} />
      ))}
      {[0, 1, 2].map((i) => (
        <motion.g key={i} animate={{ x: i % 2 ? [380, -40] : [-40, 380] }} transition={linear(14 + i * 4, { delay: -i * 5 })}>
          <g transform={`translate(0 ${96 + i * 62}) scale(${i % 2 ? -1 : 1} 1)`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
            <path d="M0 0 Q14 -12 30 0 Q14 12 0 0Z" fill={[K.peach, K.honey, K.matchaSoft][i]} {...OUT} strokeWidth={2} />
            <path d="M0 0 L-12 -8 V8Z" fill={[K.peachDark, K.honeyDark, K.matcha][i]} {...OUT} strokeWidth={2} />
            <circle cx={22} cy={-2} r={2} fill={INK} />
          </g>
        </motion.g>
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.circle key={i} cx={30 + hash(i + 3) * 340} cy={330} r={3 + hash(i + 8) * 4} fill="none" stroke={K.cream} strokeWidth={2} animate={{ y: [0, -300], opacity: [0.9, 0] }} transition={linear(5 + hash(i + 20) * 3, { delay: hash(i + 40) * 4 })} />
      ))}
      <rect x={4} y={4} width={392} height={402} rx={26} fill="none" stroke={K.cream} strokeWidth={4} opacity={0.4} />
    </g>
  );
}

/* ───────────────────────── FASE 4 ───────────────────────── */

function BgCamping({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#14174F"], [70, "#3C3A8E"], [100, "#6A56A8"]]} />
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.circle key={i} cx={8 + hash(i + 500) * 384} cy={8 + hash(i + 520) * 200} r={1.2 + hash(i + 540) * 2} fill={i % 4 ? K.cream : K.honeySoft} animate={{ opacity: [0.35, 1, 0.35] }} transition={loop(2 + hash(i + 560) * 3, { delay: hash(i + 580) * 3 })} />
      ))}
      <path d="M300 40 A26 26 0 1 0 322 78 A20 20 0 1 1 300 40Z" fill={K.honeySoft} stroke={K.honey} strokeWidth={2.4} />
      <path d="M-10 260 L70 170 L140 252 L210 190 L290 262 L350 200 L410 250 V360 H-10Z" fill="#2B2A72" />
      <path d="M-10 296 Q100 262 200 292 Q300 262 410 292 V360 H-10Z" fill="#3A3585" />
      <Pine x={40} y={340} s={1.3} fill="#2F7A4A" />
      <Pine x={364} y={338} s={1.2} fill="#2F7A4A" />
      <Pine x={86} y={344} s={0.9} fill="#3B8F58" />
      <rect x={0} y={336} width={400} height={74} fill="#2E6B46" />
      <path d="M0 336 Q100 328 200 336 Q300 344 400 336" fill="none" stroke="#4FA06A" strokeWidth={3} />
      <g>
        <path d="M268 340 L318 242 L368 340Z" fill={K.peach} {...OUT} />
        <path d="M318 242 L318 340" stroke={INK} strokeWidth={2.6} />
        <path d="M304 340 L318 288 L332 340Z" fill="#7A3A30" {...OUT} strokeWidth={2.2} />
        <path d="M318 242 L318 226 L336 232 L318 238" fill={K.honey} {...OUT} strokeWidth={2} />
      </g>
      <g>
        <path d="M118 346 L162 332 M118 332 L162 346" stroke={K.woodDark} strokeWidth={9} strokeLinecap="round" />
        <motion.g style={fb(0.5, 1)} animate={{ scale: [1, 1.12, 0.95, 1.08, 1], rotate: [-2, 2, -2, 2, -2] }} transition={loop(1.1)}>
          <path d="M140 336 Q118 312 132 292 Q136 306 146 300 Q150 278 140 262 Q170 282 164 312 Q162 328 140 336Z" fill="#FF8A3C" {...OUT} strokeWidth={2.2} />
          <path d="M140 332 Q128 316 140 304 Q150 316 140 332Z" fill={K.honeySoft} />
        </motion.g>
      </g>
      <motion.circle cx={140} cy={300} r={60} fill="#FFB35C" opacity={0.18} style={fb()} animate={{ scale: [0.9, 1.1, 0.9] }} transition={loop(1.6)} />
      <Mote x={190} y={250} d={0.3} color="#FFD27A" />
      <Mote x={230} y={296} d={1.1} color="#FFD27A" r={2} />
      <Mote x={100} y={280} d={1.7} color="#FFD27A" r={2} />
    </g>
  );
}

function BgFarm({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#9EDBFF"], [100, "#E6F7FF"]]} />
      <Cloud x={90} y={60} s={0.8} drift={16} dur={15} />
      <Cloud x={300} y={92} s={0.6} drift={12} dur={12} />
      <path d="M-10 262 Q90 222 190 256 Q290 226 410 258 V360 H-10Z" fill="#B5E889" {...OUT} />
      <rect x={0} y={336} width={400} height={74} fill="#94D857" />
      <g>
        <rect x={246} y={170} width={130} height={110} fill="#E0533F" {...OUT} />
        <path d="M236 172 L311 110 L386 172Z" fill="#B53F30" {...OUT} />
        <rect x={278} y={206} width={66} height={74} fill="#FFF3EA" {...OUT} />
        <path d="M278 206 L344 280 M344 206 L278 280" stroke="#E0533F" strokeWidth={4} />
        <circle cx={311} cy={146} r={9} fill="#FFF3EA" {...OUT} strokeWidth={2.2} />
      </g>
      <g>
        <path d="M82 340 L96 190 H104 L118 340Z" fill={K.cream} {...OUT} strokeWidth={2.4} />
        <path d="M100 340 V280" stroke={INK} strokeWidth={2} opacity={0.35} />
        <motion.g style={fb()} animate={{ rotate: 360 }} transition={linear(8)}>
          <circle cx={100} cy={188} r={56} fill="none" stroke="none" />
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d={`M100 188 L${polar(100, 188, 54, a - 10)[0]} ${polar(100, 188, 54, a - 10)[1]} L${polar(100, 188, 54, a + 10)[0]} ${polar(100, 188, 54, a + 10)[1]}Z`} fill={K.peach} {...OUT} strokeWidth={2.2} />
          ))}
        </motion.g>
        <circle cx={100} cy={188} r={7} fill={K.honey} {...OUT} strokeWidth={2.2} />
      </g>
      <g>
        <path d="M0 330 H400" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d="M0 330 H400" stroke={K.woodLight} strokeWidth={5} strokeLinecap="round" />
        {[18, 78, 138, 198, 258, 318, 378].map((x) => (
          <rect key={x} x={x - 6} y={296} width={12} height={46} rx={3} fill={K.woodLight} {...OUT} strokeWidth={2.2} />
        ))}
      </g>
      <g>
        <ellipse cx={168} cy={346} rx={30} ry={20} fill="#EDC86A" {...OUT} />
        <path d="M144 340 q8 -4 12 2 M166 334 q8 -4 12 2 M150 354 q8 -4 12 2" fill="none" stroke="#C9A24A" strokeWidth={2.4} strokeLinecap="round" />
      </g>
      <Mote x={160} y={210} d={0.6} color={K.cream} />
    </g>
  );
}

/* ───────────────────────── FASE 5 ───────────────────────── */

function AutumnTree({ x, y, s, c1, c2 }: { x: number; y: number; s: number; c1: string; c2: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
      <path d="M-9 0 L-6 -70 H6 L9 0Z" fill={K.woodDark} {...OUT} />
      <circle cx={0} cy={-100} r={46} fill={c1} {...OUT} />
      <circle cx={-34} cy={-76} r={30} fill={c2} {...OUT} />
      <circle cx={34} cy={-78} r={30} fill={c2} {...OUT} />
      <path d="M-22 -118 Q-8 -128 6 -122" fill="none" stroke={K.cream} strokeWidth={4} strokeLinecap="round" opacity={0.5} />
    </g>
  );
}

function BgAutumnPark({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#FFD7A0"], [100, "#FFF1D6"]]} />
      <Cloud x={280} y={64} s={0.8} drift={14} dur={14} fill="#FFF7EC" />
      <path d="M-10 262 Q100 230 200 258 Q300 232 410 262 V360 H-10Z" fill="#E8B96A" {...OUT} />
      <AutumnTree x={52} y={308} s={1.1} c1="#F08A3C" c2="#E0553F" />
      <AutumnTree x={352} y={312} s={1.2} c1="#E0553F" c2="#F2A83C" />
      <rect x={0} y={336} width={400} height={74} fill="#D9A25A" />
      <path d="M0 336 Q100 328 200 336 Q300 344 400 336" fill="none" stroke="#EDBE7A" strokeWidth={3} />
      <g>
        <rect x={130} y={298} width={140} height={10} rx={4} fill={K.woodLight} {...OUT} />
        <rect x={130} y={278} width={140} height={8} rx={4} fill={K.woodLight} {...OUT} />
        <path d="M142 308 V336 M258 308 V336 M142 278 V298 M258 278 V298" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.path
          key={i}
          d="M0 -8 Q7 -4 5 1 Q9 5 0 9 Q-9 5 -5 1 Q-7 -4 0 -8Z"
          transform={`translate(${20 + hash(i + 70) * 360} 20)`}
          style={{ transformBox: "view-box", transformOrigin: "0 0" }}
          fill={["#F08A3C", "#E0553F", K.honey][i % 3]}
          stroke={INK}
          strokeWidth={1.6}
          animate={{ y: [0, 330], x: [0, i % 2 ? 30 : -30], rotate: [0, 200], opacity: [0, 1, 1, 0] }}
          transition={linear(6 + hash(i + 90) * 4, { delay: hash(i + 110) * 6 })}
        />
      ))}
      {[70, 112, 292, 330].map((x, i) => (
        <ellipse key={x} cx={x} cy={352 + (i % 2) * 6} rx={14} ry={5} fill={["#F08A3C", "#E0553F"][i % 2]} stroke={INK} strokeWidth={2} />
      ))}
    </g>
  );
}

function BgLanternFestival({ uid }: BgProps) {
  const lanterns = [
    { x: 54, y: 90, c: K.peach },
    { x: 130, y: 130, c: K.honey },
    { x: 214, y: 86, c: K.taro },
    { x: 296, y: 126, c: K.peach },
    { x: 360, y: 84, c: K.honey },
  ];
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#1F1550"], [60, "#4A2A7A"], [100, "#7A3E8A"]]} />
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.circle key={i} cx={10 + hash(i + 610) * 380} cy={8 + hash(i + 630) * 150} r={1.2 + hash(i + 650) * 1.6} fill={K.cream} animate={{ opacity: [0.3, 1, 0.3] }} transition={loop(2 + hash(i + 670) * 3, { delay: hash(i + 690) * 3 })} />
      ))}
      <path d="M-4 60 Q100 100 200 62 Q300 100 404 60" fill="none" stroke={INK} strokeWidth={3} />
      {lanterns.map((l, i) => (
        <motion.g key={l.x} style={fb(0.5, 0)} animate={{ rotate: [-6, 6, -6] }} transition={loop(2.8 + (i % 3) * 0.5, { delay: i * 0.3 })}>
          <path d={`M${l.x} ${l.y - 30} V${l.y - 16}`} stroke={INK} strokeWidth={2.4} />
          <ellipse cx={l.x} cy={l.y} rx={20} ry={24} fill={l.c} {...OUT} />
          <path d={`M${l.x - 10} ${l.y - 22} Q${l.x - 18} ${l.y} ${l.x - 10} ${l.y + 22} M${l.x + 10} ${l.y - 22} Q${l.x + 18} ${l.y} ${l.x + 10} ${l.y + 22}`} fill="none" stroke={INK} strokeWidth={1.8} opacity={0.5} />
          <rect x={l.x - 8} y={l.y - 28} width={16} height={6} rx={2} fill={K.honeyDark} {...OUT} strokeWidth={2} />
          <rect x={l.x - 6} y={l.y + 22} width={12} height={5} rx={2} fill={K.honeyDark} {...OUT} strokeWidth={2} />
          <path d={`M${l.x} ${l.y + 27} v10`} stroke={K.honey} strokeWidth={3} strokeLinecap="round" />
          <motion.ellipse cx={l.x} cy={l.y} rx={30} ry={34} fill={l.c} opacity={0.18} animate={{ opacity: [0.1, 0.26, 0.1] }} transition={loop(2 + i * 0.3)} />
        </motion.g>
      ))}
      <g>
        <rect x={20} y={226} width={120} height={112} fill="#5C3A7A" {...OUT} />
        <path d="M10 226 L30 196 H130 L150 226Z" fill={K.peach} {...OUT} />
        <path d="M44 196 L38 226 M70 196 L66 226 M96 196 L94 226 M122 196 L122 226" stroke={K.cream} strokeWidth={4} />
        <rect x={32} y={260} width={96} height={12} rx={4} fill={K.woodLight} {...OUT} strokeWidth={2.2} />
        <circle cx={56} cy={248} r={9} fill={K.honey} {...OUT} strokeWidth={2} />
        <circle cx={84} cy={248} r={9} fill={K.sky} {...OUT} strokeWidth={2} />
        <circle cx={112} cy={248} r={9} fill={K.matcha} {...OUT} strokeWidth={2} />
      </g>
      <g>
        <rect x={262} y={226} width={120} height={112} fill="#5C3A7A" {...OUT} />
        <path d="M252 226 L272 196 H372 L392 226Z" fill={K.sky} {...OUT} />
        <path d="M286 196 L280 226 M312 196 L308 226 M338 196 L336 226 M364 196 L364 226" stroke={K.cream} strokeWidth={4} />
        <rect x={274} y={260} width={96} height={12} rx={4} fill={K.woodLight} {...OUT} strokeWidth={2.2} />
        <path d="M300 256 l8 -18 l8 18Z M330 256 l8 -18 l8 18Z" fill={K.honeySoft} {...OUT} strokeWidth={2} />
      </g>
      <rect x={0} y={338} width={400} height={72} fill="#3A2460" />
      <path d="M0 338 H400" stroke={INK} strokeWidth={2.6} />
      <g stroke="#5C3A7A" strokeWidth={2.4} opacity={0.8}>
        <path d="M0 366 H400 M0 388 H400 M80 338 V366 M200 338 V366 M320 338 V366 M140 366 V388 M260 366 V388" />
      </g>
      <Spark x={196} y={190} size={7} color={K.honeySoft} delay={0.4} />
      <Spark x={200} y={290} size={6} color={K.cream} delay={1.3} />
    </g>
  );
}

/* ───────────────────────── FASE 6 ───────────────────────── */

function BgMountainDawn({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#8E86D8"], [45, "#F2A8C4"], [80, "#FFD0A0"], [100, "#FFE9B8"]]} />
      <motion.circle cx={200} cy={236} r={96} fill="#FFF0B0" opacity={0.45} style={fb()} animate={{ scale: [0.94, 1.08, 0.94] }} transition={loop(5)} />
      <circle cx={200} cy={236} r={48} fill="#FFD76A" stroke="#F2B800" strokeWidth={3} />
      <path d="M-10 270 L70 150 L130 230 L190 130 L260 236 L320 170 L410 268 V340 H-10Z" fill="#9F8BD0" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M70 150 L52 178 L68 172 L80 184 L92 172Z M190 130 L168 166 L184 158 L196 172 L210 160 L216 168Z M320 170 L304 194 L316 188 L326 198 L338 188Z" fill={K.cream} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M-10 300 L60 240 L140 296 L220 246 L300 300 L380 250 L410 280 V350 H-10Z" fill="#7C6AB8" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      {[0, 1].map((i) => (
        <motion.g key={i} animate={{ x: i ? [-20, 30, -20] : [20, -30, 20] }} transition={loop(12 + i * 4)}>
          <ellipse cx={120 + i * 150} cy={286 + i * 8} rx={90} ry={11} fill={K.cream} opacity={0.6} />
        </motion.g>
      ))}
      {[0, 1, 2].map((i) => (
        <motion.path key={i} d="M0 0 q8 -8 16 0 q8 -8 16 0" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" animate={{ x: [-30, 440], y: [0, -20, 0] }} transition={linear(18 + i * 3, { delay: -i * 6 })} style={{ translateY: 70 + i * 30 }} />
      ))}
      <path d="M-10 330 Q90 306 200 330 Q310 306 410 330 V410 H-10Z" fill="#6AA66A" stroke={INK} strokeWidth={2.6} />
      <rect x={0} y={346} width={400} height={64} fill="#5B9A5E" />
      <Pine x={34} y={344} s={0.9} fill="#2F7A4A" />
      <Pine x={372} y={344} s={1} fill="#2F7A4A" />
      <Spark x={104} y={104} size={7} color={K.cream} delay={0.2} />
      <Spark x={308} y={90} size={6} color={K.cream} delay={1.1} />
    </g>
  );
}

function BgMoonBase({ uid }: BgProps) {
  return (
    <g>
      <rect x={0} y={0} width={400} height={410} fill="#0F1038" />
      {Array.from({ length: 34 }).map((_, i) => (
        <motion.circle key={i} cx={6 + hash(i + 800) * 388} cy={6 + hash(i + 830) * 270} r={1 + hash(i + 860) * 2} fill={i % 5 ? K.cream : K.honeySoft} animate={{ opacity: [0.3, 1, 0.3] }} transition={loop(2 + hash(i + 890) * 3, { delay: hash(i + 920) * 3 })} />
      ))}
      <g>
        <defs>
          <clipPath id={`${uid}-earth`}>
            <circle cx={296} cy={110} r={54} />
          </clipPath>
        </defs>
        <circle cx={296} cy={110} r={54} fill="#3A93E8" stroke={INK} strokeWidth={3} />
        <g clipPath={`url(#${uid}-earth)`}>
          <path d="M262 92 Q280 78 292 96 Q300 112 282 122 Q264 120 262 92Z M308 126 Q326 116 340 130 Q338 150 316 150Z" fill="#58CC02" />
          <motion.g animate={{ x: [0, 22, 0] }} transition={loop(10)}>
            <ellipse cx={286} cy={84} rx={26} ry={7} fill={K.cream} opacity={0.8} />
            <ellipse cx={316} cy={134} rx={24} ry={6} fill={K.cream} opacity={0.8} />
          </motion.g>
        </g>
        <path d="M268 88 Q276 76 292 74" fill="none" stroke={K.cream} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      </g>
      <path d="M-10 300 Q100 270 200 296 Q300 270 410 300 V410 H-10Z" fill="#B9B6CF" stroke={INK} strokeWidth={2.6} />
      <rect x={0} y={330} width={400} height={80} fill="#A5A2C0" />
      {[
        [60, 360, 28, 8],
        [330, 372, 34, 9],
        [250, 392, 22, 6],
        [130, 388, 26, 7],
      ].map(([cx, cy, rx, ry]) => (
        <g key={`${cx}${cy}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#8D8AAE" stroke={INK} strokeWidth={2} />
          <path d={`M${cx - rx + 4} ${cy - 1} Q${cx} ${cy - ry - 2} ${cx + rx - 4} ${cy - 1}`} fill="none" stroke="#C9C6E0" strokeWidth={2.2} strokeLinecap="round" />
        </g>
      ))}
      <g>
        <path d="M50 330 Q50 262 112 262 Q174 262 174 330Z" fill={K.cream} stroke={INK} strokeWidth={3} />
        <path d="M70 330 Q70 282 112 282 Q154 282 154 330" fill="#CFE6F5" stroke={INK} strokeWidth={2.4} />
        <motion.rect x={96} y={296} width={32} height={34} rx={6} fill="#FFE27A" stroke={INK} strokeWidth={2.4} animate={{ opacity: [0.7, 1, 0.7] }} transition={loop(2.2)} />
        <path d="M112 262 V234" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <motion.circle cx={112} cy={230} r={5} fill={K.peach} stroke={INK} strokeWidth={2} animate={{ opacity: [1, 0.2, 1] }} transition={loop(1.2)} />
      </g>
      <g>
        <path d="M352 332 V262" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <motion.path d="M352 264 H386 L376 276 L386 288 H352Z" fill={K.peach} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" style={fb(0, 0.5)} animate={{ scaleX: [1, 0.86, 1] }} transition={loop(1.8)} />
      </g>
    </g>
  );
}

/* ───────────────────────── FASE 7 ───────────────────────── */

function BgCoralReef({ uid }: BgProps) {
  const corals = [
    { x: 40, c: K.peach, h: 80 },
    { x: 92, c: K.taro, h: 56 },
    { x: 316, c: K.honey, h: 70 },
    { x: 368, c: K.peachSoft, h: 92 },
  ];
  return (
    <g>
      <SkyRect id={`${uid}-water`} stops={[[0, "#46C2F2"], [55, "#1E7FD0"], [100, "#12409A"]]} />
      <g opacity={0.22}>
        <polygon points="40,0 90,0 170,336 100,336" fill={K.cream} />
        <polygon points="190,0 220,0 300,336 240,336" fill={K.cream} />
        <polygon points="300,0 322,0 380,336 330,336" fill={K.cream} />
      </g>
      <rect x={0} y={336} width={400} height={74} fill="#F0CE90" />
      <path d="M0 336 Q100 326 200 336 Q300 346 400 336" fill="none" stroke="#DDB878" strokeWidth={3} />
      {corals.map((c, i) => (
        <motion.g key={c.x} style={fb(0.5, 1)} animate={{ rotate: [-3, 3, -3] }} transition={loop(3.6 + i * 0.5)}>
          <path d={`M${c.x} 340 V${340 - c.h} M${c.x} 320 Q${c.x - 22} 306 ${c.x - 24} ${300 - c.h * 0.2} M${c.x} 306 Q${c.x + 22} 290 ${c.x + 24} ${284 - c.h * 0.2}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
          <path d={`M${c.x} 340 V${340 - c.h} M${c.x} 320 Q${c.x - 22} 306 ${c.x - 24} ${300 - c.h * 0.2} M${c.x} 306 Q${c.x + 22} 290 ${c.x + 24} ${284 - c.h * 0.2}`} fill="none" stroke={c.c} strokeWidth={8} strokeLinecap="round" />
        </motion.g>
      ))}
      <g>
        <rect x={262} y={318} width={46} height={24} rx={5} fill={K.woodDark} {...OUT} strokeWidth={2.2} />
        <path d="M262 326 Q285 304 308 326Z" fill={K.wood} {...OUT} strokeWidth={2.2} />
        <rect x={280} y={324} width={10} height={10} rx={2} fill={K.honey} {...OUT} strokeWidth={1.8} />
      </g>
      {[0, 1, 2].map((i) => (
        <motion.g key={i} animate={{ x: i % 2 ? [380, -60] : [-60, 380] }} transition={linear(16 + i * 4, { delay: -i * 6 })}>
          <g transform={`translate(0 ${70 + i * 54}) scale(${i % 2 ? -1 : 1} 1)`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
            {[0, 1, 2].map((j) => (
              <g key={j} transform={`translate(${j * 22} ${j % 2 ? 10 : -6})`} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
                <path d="M0 0 Q10 -9 22 0 Q10 9 0 0Z" fill={[K.honey, K.peach, K.matchaSoft][i]} {...OUT} strokeWidth={1.8} />
                <path d="M0 0 L-8 -6 V6Z" fill={[K.honeyDark, K.peachDark, K.matcha][i]} {...OUT} strokeWidth={1.8} />
                <circle cx={16} cy={-1.5} r={1.5} fill={INK} />
              </g>
            ))}
          </g>
        </motion.g>
      ))}
      <motion.g style={fb()} animate={{ scale: [1, 0.86, 1], y: [0, -12, 0] }} transition={loop(2.6)}>
        <path d="M200 120 Q200 96 224 96 Q248 96 248 120Z" fill={K.taroSoft} opacity={0.9} {...OUT} strokeWidth={2.2} />
        <path d="M208 122 q0 22 -4 30 M224 122 q0 26 0 36 M240 122 q0 22 4 30" fill="none" stroke={K.taro} strokeWidth={3.2} strokeLinecap="round" />
      </motion.g>
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.circle key={i} cx={30 + hash(i + 7) * 340} cy={336} r={3 + hash(i + 12) * 4} fill="none" stroke={K.cream} strokeWidth={2} animate={{ y: [0, -320], opacity: [0.9, 0] }} transition={linear(5 + hash(i + 25) * 3, { delay: hash(i + 45) * 4 })} />
      ))}
    </g>
  );
}

function BgFairyCastle({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#B7DCFF"], [60, "#F0D4FF"], [100, "#FFE3EC"]]} />
      <g fill="none" strokeLinecap="round" opacity={0.85}>
        {[K.peach, K.honey, K.matcha, K.sky, K.taro].map((c, i) => (
          <path key={c} d={`M10 ${300 - i * 8} Q200 ${40 + i * 8} 390 ${300 - i * 8}`} stroke={c} strokeWidth={8} />
        ))}
      </g>
      <Cloud x={80} y={78} s={0.9} drift={16} dur={15} />
      <Cloud x={320} y={60} s={0.7} drift={12} dur={13} />
      <path d="M-10 276 Q100 244 200 270 Q300 244 410 276 V360 H-10Z" fill="#C9F0A8" {...OUT} />
      <g>
        <rect x={150} y={176} width={100} height={146} fill="#F4E8FF" {...OUT} />
        <rect x={110} y={210} width={44} height={112} fill="#EBDDFF" {...OUT} />
        <rect x={246} y={210} width={44} height={112} fill="#EBDDFF" {...OUT} />
        <path d="M144 176 L200 106 L256 176Z" fill={K.taro} {...OUT} />
        <path d="M104 210 L132 160 L160 210Z" fill={K.peach} {...OUT} />
        <path d="M240 210 L268 160 L296 210Z" fill={K.peach} {...OUT} />
        <motion.g style={fb(0, 0.5)} animate={{ scaleX: [1, 0.8, 1] }} transition={loop(1.6)}>
          <path d="M200 106 V82 L222 90 L200 98" fill={K.honey} {...OUT} strokeWidth={2.2} />
        </motion.g>
        <path d="M178 322 V268 Q178 244 200 244 Q222 244 222 268 V322Z" fill="#7A4FB0" {...OUT} />
        <circle cx={200} cy={206} r={11} fill="#CFE6F5" {...OUT} strokeWidth={2.4} />
        <rect x={122} y={238} width={14} height={20} rx={7} fill="#CFE6F5" {...OUT} strokeWidth={2.2} />
        <rect x={264} y={238} width={14} height={20} rx={7} fill="#CFE6F5" {...OUT} strokeWidth={2.2} />
      </g>
      <rect x={0} y={336} width={400} height={74} fill="#A5E07A" />
      <path d="M0 336 Q100 328 200 336 Q300 344 400 336" fill="none" stroke="#C9F0A8" strokeWidth={3} />
      <Spark x={70} y={170} size={8} color={K.honey} delay={0.2} />
      <Spark x={336} y={150} size={8} color={K.cream} delay={0.9} />
      <Spark x={310} y={250} size={6} color={K.peachSoft} delay={1.5} />
    </g>
  );
}

/* ───────────────────────── FASE 8 ───────────────────────── */

const AURORA_BANDS = [
  { a: "M-10 120 Q100 40 200 110 T410 90 V170 Q300 220 200 170 T-10 200Z", b: "M-10 100 Q100 150 200 90 T410 120 V190 Q300 150 200 210 T-10 170Z", c: "#58E0A0", d: 6 },
  { a: "M-10 160 Q110 100 210 150 T410 130 V200 Q300 240 200 200 T-10 230Z", b: "M-10 140 Q110 190 210 130 T410 160 V220 Q300 190 200 240 T-10 200Z", c: "#7AA8FF", d: 8 },
  { a: "M-10 70 Q90 20 200 64 T410 50 V100 Q300 140 200 100 T-10 120Z", b: "M-10 56 Q90 96 200 40 T410 70 V120 Q300 90 200 130 T-10 100Z", c: "#C28BFF", d: 7 },
] as const;

function BgAuroraLake({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#071235"], [60, "#10285A"], [100, "#1D3F78"]]} />
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.circle key={i} cx={6 + hash(i + 1100) * 388} cy={6 + hash(i + 1130) * 230} r={1 + hash(i + 1160) * 1.8} fill={K.cream} animate={{ opacity: [0.3, 1, 0.3] }} transition={loop(2 + hash(i + 1190) * 3, { delay: hash(i + 1220) * 3 })} />
      ))}
      {AURORA_BANDS.map((b) => (
        <motion.path key={b.c} d={b.a} fill={b.c} opacity={0.4} animate={{ d: [b.a, b.b, b.a], opacity: [0.28, 0.5, 0.28] }} transition={loop(b.d)} />
      ))}
      <path d="M-10 262 L60 196 L120 250 L190 184 L260 252 L330 198 L410 262 V300 H-10Z" fill="#0B1B44" />
      <path d="M-10 276 L50 232 L110 272 L170 236 L240 274 L320 230 L410 276 V320 H-10Z" fill="#12285C" />
      <rect x={0} y={300} width={400} height={110} fill="#0E2A55" />
      <path d="M0 300 H400" stroke="#2E5CA0" strokeWidth={3} />
      {AURORA_BANDS.map((b, i) => (
        <motion.rect key={b.c} x={30 + i * 90} y={314 + i * 8} width={150} height={10} rx={5} fill={b.c} opacity={0.35} animate={{ x: [30 + i * 90, 50 + i * 90, 30 + i * 90], opacity: [0.2, 0.45, 0.2] }} transition={loop(4 + i)} />
      ))}
      <Pine x={34} y={310} s={1.2} fill="#0F3A3A" outline={false} trunk="#0A2A2A" />
      <Pine x={76} y={314} s={0.9} fill="#145048" outline={false} trunk="#0A2A2A" />
      <Pine x={366} y={312} s={1.2} fill="#0F3A3A" outline={false} trunk="#0A2A2A" />
      <rect x={0} y={340} width={400} height={70} fill="#16345F" opacity={0.8} />
      <Spark x={150} y={60} size={7} color={K.cream} delay={0.3} />
      <Spark x={300} y={40} size={6} color={K.skySoft} delay={1.2} />
    </g>
  );
}

function BgRainbowSummit({ uid }: BgProps) {
  return (
    <g>
      <SkyRect id={`${uid}-sky`} stops={[[0, "#FFE9A0"], [50, "#FFD0C8"], [100, "#E8C8FF"]]} />
      <motion.g style={fb()} animate={{ rotate: 360 }} transition={linear(70)}>
        <circle cx={200} cy={150} r={200} fill="none" stroke="none" />
        {Array.from({ length: 16 }).map((_, i) => {
          const [x1, y1] = polar(200, 150, 60, i * 22.5 - 4);
          const [x2, y2] = polar(200, 150, 200, i * 22.5);
          const [x3, y3] = polar(200, 150, 60, i * 22.5 + 4);
          return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill="#FFF3C8" opacity={0.5} />;
        })}
      </motion.g>
      <g fill="none" strokeLinecap="round">
        {[K.peach, K.honey, K.matcha, K.sky, K.taro].map((c, i) => (
          <path key={c} d={`M-10 ${280 - i * 9} Q200 ${-20 + i * 9} 410 ${280 - i * 9}`} stroke={c} strokeWidth={9} opacity={0.9} />
        ))}
      </g>
      <Cloud x={70} y={196} s={1.1} drift={12} dur={13} />
      <Cloud x={336} y={176} s={0.9} drift={10} dur={11} />
      <Cloud x={200} y={262} s={1.3} drift={14} dur={15} />
      <path d="M-10 318 Q60 286 120 312 Q180 280 240 310 Q310 282 410 314 V410 H-10Z" fill={K.cream} {...OUT} />
      <rect x={0} y={346} width={400} height={64} fill="#FFF3E0" />
      <path d="M0 346 Q100 336 200 346 Q300 356 400 346" fill="none" stroke="#FFE3EC" strokeWidth={4} strokeLinecap="round" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Spark key={i} x={20 + hash(i + 1300) * 360} y={20 + hash(i + 1320) * 240} size={5 + hash(i + 1340) * 4} color={i % 3 ? K.honey : K.cream} delay={hash(i + 1360) * 2} />
      ))}
      <motion.g animate={{ y: [0, -8, 0] }} transition={loop(3.2)}>
        <polygon points={starPts(200, 70, 20, 9)} fill={K.honey} {...OUT} />
      </motion.g>
    </g>
  );
}

export const EXTRA_BG_REG: Readonly<Record<string, ComponentType<BgProps>>> = {
  bg_meadow_morning: BgMeadowMorning,
  bg_rainy_window: BgRainyWindow,
  bg_bakery_warm: BgBakery,
  bg_sunflower_field: BgSunflowerField,
  bg_playground: BgPlayground,
  bg_aquarium_blue: BgAquarium,
  bg_camping_night: BgCamping,
  bg_farm_happy: BgFarm,
  bg_autumn_park: BgAutumnPark,
  bg_lantern_festival: BgLanternFestival,
  bg_mountain_dawn: BgMountainDawn,
  bg_moon_base: BgMoonBase,
  bg_coral_reef: BgCoralReef,
  bg_fairy_castle: BgFairyCastle,
  bg_aurora_lake: BgAuroraLake,
  bg_rainbow_summit: BgRainbowSummit,
};

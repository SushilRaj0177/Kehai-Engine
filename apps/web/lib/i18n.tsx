"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ja";

const STORAGE_KEY = "kehai.locale";

const dict = {
  nav: {
    discover: { en: "Discover", ja: "探す" },
    console: { en: "Organizer Console", ja: "主催者コンソール" },
    signIn: { en: "Sign in", ja: "ログイン" },
    getStarted: { en: "Get started", ja: "はじめる" },
  },
  hero: {
    badge: { en: "Attendance & event intelligence platform", ja: "出席・イベント インテリジェンス プラットフォーム" },
    titleLine1: { en: "Presence you can", ja: "証明できる" },
    titleVerify: { en: "verify", ja: "存在" },
    titleLine2: { en: "Insight you can", ja: "信頼できる" },
    titleTrust: { en: "trust", ja: "洞察" },
    body: {
      en: "Kehai Engine turns QR check-ins into geospatially verified attendance records, real-time organizer dashboards, and AI-grounded event analytics — for university clubs, hackathons, conferences, and companies that outgrew spreadsheets.",
      ja: "気配エンジンは、QRチェックインを地理的に検証された出席記録、リアルタイムの主催者ダッシュボード、そしてAIによるイベント分析へと変換します。大学のサークル、ハッカソン、カンファレンス、そしてスプレッドシートを卒業した企業のために。",
    },
    ctaPrimary: { en: "Start an organization", ja: "組織を始める" },
    ctaSecondary: { en: "Browse live events", ja: "開催中のイベントを見る" },
    statGeofence: { en: "geofence precision floor", ja: "ジオフェンス精度の下限" },
    statRotation: { en: "default QR rotation", ja: "既定のQR更新間隔" },
    statLayers: { en: "layers of intelligence", ja: "インテリジェンスの層" },
    statFabricated: { en: "fabricated metrics", ja: "捏造された指標" },
  },
  pillars: {
    kicker: { en: "Not an attendance form", ja: "単なる出席フォームではない" },
    title: { en: "Every layer is built to be genuinely correct.", ja: "すべての層が、真に正確であるように作られている。" },
    subtitle: {
      en: "Not merely demo-shaped — check-in, dashboard, analytics, AI.",
      ja: "デモ用ではない — チェックイン、ダッシュボード、分析、AI。",
    },
    items: [
      {
        glyph: "検",
        title: { en: "Verified presence", ja: "検証された存在" },
        body: {
          en: "Rotating, signed QR tokens plus GPS-accuracy-aware geofencing — not a static code and a naive radius check.",
          ja: "署名付きで自動更新されるQRトークンと、GPS精度を考慮したジオフェンス。固定コードと単純な半径判定ではない。",
        },
      },
      {
        glyph: "生",
        title: { en: "Live, not eventually", ja: "即時に、いずれではなく" },
        body: {
          en: "Socket-based dashboards update the moment someone checks in — attendee count, rate, and timeline redraw instantly.",
          ja: "チェックインの瞬間にダッシュボードが更新される。参加人数、割合、タイムラインが即座に描き直される。",
        },
      },
      {
        glyph: "知",
        title: { en: "Grounded intelligence", ja: "根拠に基づく知性" },
        body: {
          en: "Exact statistics computed deterministically; AI is used only to interpret and explain them — never to guess numbers.",
          ja: "統計は決定論的に正確に計算される。AIはそれを解釈し説明するためだけに使われ、数値を推測することはない。",
        },
      },
      {
        glyph: "組",
        title: { en: "Built for organizations", ja: "組織のために設計" },
        body: {
          en: "Multi-tenant from day one — organizations, roles, and events, with backend-enforced authorization throughout.",
          ja: "最初からマルチテナント対応。組織、権限、イベントすべてにバックエンドで認可が徹底される。",
        },
      },
    ],
  },
  flow: {
    kicker: { en: "The flow", ja: "フロー" },
    title: { en: "Raw check-ins become decisions.", ja: "生のチェックインが意思決定になる。" },
    subtitle: {
      en: "Attendance → information → insight → recommendation → action.",
      ja: "出席 → 情報 → 洞察 → 提案 → 行動。",
    },
    steps: [
      { en: "Organizer publishes an event with a geofenced venue and rotating QR.", ja: "主催者がジオフェンス設定済みの会場と自動更新QRでイベントを公開する。" },
      { en: "Attendee scans, shares location, and gets an honest distance readout.", ja: "参加者がスキャンして位置情報を共有し、正確な距離が表示される。" },
      { en: "Backend verifies token + geofence + timing, records attendance once.", ja: "バックエンドがトークン・ジオフェンス・時刻を検証し、出席を一度だけ記録する。" },
      { en: "Dashboard updates live — count, rate, and arrival timeline redraw instantly.", ja: "ダッシュボードがリアルタイムに更新される — 人数、割合、到着タイムラインが即座に変わる。" },
      { en: "AI layer explains anomalies and answers questions grounded in exact data.", ja: "AI層が異常を説明し、正確なデータに基づいて質問に答える。" },
    ],
  },
} as const;

type Dict = typeof dict;

function resolve(path: string, locale: Locale): string {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dict;
  for (const part of parts) node = node?.[part];
  return node?.[locale] ?? node?.en ?? path;
}

interface LocaleState {
  locale: Locale;
  toggle: () => void;
  t: (path: string) => string;
  pillars: Dict["pillars"]["items"];
  steps: Dict["flow"]["steps"];
}

const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ja") setLocale(stored);
    } catch {
      // ignore — localStorage unavailable
    }
  }, []);

  const value = useMemo<LocaleState>(
    () => ({
      locale,
      toggle: () =>
        setLocale((prev) => {
          const next = prev === "en" ? "ja" : "en";
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            // ignore
          }
          return next;
        }),
      t: (path: string) => resolve(path, locale),
      pillars: dict.pillars.items,
      steps: dict.flow.steps,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

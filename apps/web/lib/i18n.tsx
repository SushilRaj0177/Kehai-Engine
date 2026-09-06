"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ja";

const STORAGE_KEY = "kehai.locale";

const dict = {
  nav: {
    discover: { en: "Discover", ja: "探す" },
    myEvents: { en: "My Events", ja: "マイイベント" },
    classrooms: { en: "Classrooms", ja: "クラス" },
    console: { en: "Organizer Console", ja: "主催者コンソール" },
    signIn: { en: "Sign in", ja: "ログイン" },
    signOut: { en: "Sign out", ja: "ログアウト" },
    getStarted: { en: "Get started", ja: "はじめる" },
  },
  hero: {
    badge: { en: "Attendance & event intelligence platform", ja: "出席・イベントインテリジェンス・プラットフォーム" },
    titleLine1: { en: "Presence you can", ja: "証明できる" },
    titleVerify: { en: "verify", ja: "存在" },
    titleLine2: { en: "Insight you can", ja: "信頼できる" },
    titleTrust: { en: "trust", ja: "洞察" },
    body: {
      en: "Kehai Engine turns QR check-ins into geospatially verified attendance records, real-time organizer dashboards, and AI-grounded event analytics — for university clubs, hackathons, conferences, and companies that outgrew spreadsheets.",
      ja: "気配エンジンは、QRチェックインを地理的に検証された出席記録、リアルタイムの主催者ダッシュボード、そしてAIによるイベント分析へと変換します。大学のサークル、ハッカソン、カンファレンス、そしてスプレッドシートでは限界を迎えた企業のために。",
    },
    ctaPrimary: { en: "Start an organization", ja: "組織を作る" },
    ctaSecondary: { en: "Browse live events", ja: "開催中のイベントを見る" },
    statGeofence: { en: "geofence precision floor", ja: "ジオフェンス精度の下限" },
    statRotation: { en: "default QR rotation", ja: "既定のQR更新間隔" },
    statLayers: { en: "layers of intelligence", ja: "インテリジェンスの層" },
    statFabricated: { en: "fabricated metrics", ja: "捏造された指標" },
  },
  pillars: {
    kicker: { en: "Real event intelligence", ja: "本物のイベントインテリジェンス" },
    title: { en: "Every layer is built to be genuinely correct.", ja: "すべての層が、真に正確であるように作られている。" },
    subtitle: {
      en: "Genuinely built — check-in, dashboard, analytics, AI.",
      ja: "本格実装 — チェックイン、ダッシュボード、分析、AI。",
    },
    items: [
      {
        glyph: "検",
        title: { en: "Verified presence", ja: "検証された存在" },
        body: {
          en: "Rotating, signed QR tokens plus GPS-accuracy-aware geofencing deliver genuinely verifiable presence.",
          ja: "署名付きで自動更新されるQRトークンと、GPS精度を考慮したジオフェンスで、確実な存在証明を実現する。",
        },
      },
      {
        glyph: "生",
        title: { en: "Live, right now", ja: "常にリアルタイム" },
        body: {
          en: "Socket-based dashboards update the moment someone checks in — attendee count, rate, and timeline redraw instantly.",
          ja: "チェックインの瞬間にダッシュボードが更新される。参加人数、割合、タイムラインが即座に描き直される。",
        },
      },
      {
        glyph: "知",
        title: { en: "Grounded intelligence", ja: "根拠に基づく知性" },
        body: {
          en: "Exact statistics computed deterministically, with AI dedicated purely to interpreting and explaining them.",
          ja: "統計は決定論的に正確に計算され、AIはそれを解釈し説明する役割に徹する。",
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
    title: { en: "Raw check-ins become decisions.", ja: "生のチェックインを、意思決定に変える。" },
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
  footer: {
    tagline: {
      en: "気配 (kehai) — a sign that someone is present, before it's seen. Attendance you can verify, analytics you can trust.",
      ja: "気配 — 見える前に、誰かがそこにいる気配。証明できる出席、信頼できる分析。",
    },
    platform: { en: "Platform", ja: "プラットフォーム" },
    project: { en: "Project", ja: "プロジェクト" },
    discoverEvents: { en: "Discover events", ja: "イベントを探す" },
    organizerConsole: { en: "Organizer console", ja: "主催者コンソール" },
    signIn: { en: "Sign in", ja: "ログイン" },
    // Kept as-is by design: "Source" and bug-report links point at GitHub,
    // which Japanese-language product sites conventionally leave in
    // English rather than translating the platform's own name/UI.
    source: { en: "Source", ja: "Source" },
    reportIssue: { en: "Report an issue", ja: "Report an issue" },
    copyright: { en: "Kehai Engine", ja: "気配エンジン" },
  },
  common: {
    signIn: { en: "Sign in", ja: "ログイン" },
    cancel: { en: "Cancel", ja: "キャンセル" },
    create: { en: "Create", ja: "作成" },
    loading: { en: "Loading…", ja: "読み込み中…" },
    viewArrow: { en: "View →", ja: "詳細を見る →" },
    tryAgain: { en: "Try again", ja: "もう一度試す" },
  },
  badge: {
    status: {
      DRAFT: { en: "Draft", ja: "下書き" },
      PUBLISHED: { en: "Published", ja: "公開中" },
      ACTIVE: { en: "Active", ja: "開催中" },
      COMPLETED: { en: "Completed", ja: "終了" },
      CANCELLED: { en: "Cancelled", ja: "中止" },
    },
    attended: { en: "Attended", ja: "出席済み" },
    pending: { en: "Pending", ja: "未出席" },
    registered: { en: "Registered", ja: "登録済み" },
    registrationClosed: { en: "Registration closed", ja: "受付終了" },
    attendanceConfirmed: { en: "Attendance confirmed", ja: "出席確認済み" },
    checkedIn: { en: "Checked in", ja: "チェックイン済み" },
    confidenceLevel: {
      high: { en: "high", ja: "高" },
      medium: { en: "medium", ja: "中" },
      low: { en: "low", ja: "低" },
    },
    confidenceSuffix: { en: "confidence", ja: "の確度" },
  },
  states: {
    checkingSession: { en: "Checking session…", ja: "セッションを確認しています…" },
    loadingEvent: { en: "Loading event…", ja: "イベントを読み込んでいます…" },
    loadingClassroom: { en: "Loading classroom…", ja: "クラスを読み込んでいます…" },
  },
  dashboard: {
    kicker: { en: "Organizer console", ja: "主催者コンソール" },
    title: { en: "Your organizations", ja: "あなたの組織" },
    subtitle: {
      en: "Every event, attendee, and check-in lives under an organization.",
      ja: "すべてのイベント、参加者、チェックインは組織の下で管理されます。",
    },
    orgUnit: { en: "organizations", ja: "組織" },
    signInPrompt: { en: "Sign in to access your organizer console.", ja: "主催者コンソールにアクセスするにはログインしてください。" },
    newOrganization: { en: "New organization", ja: "新しい組織" },
    emptyTitle: { en: "No organizations yet", ja: "組織がまだありません" },
    emptyDescription: {
      en: "Create one to start publishing events, generating check-in QR codes, and tracking live attendance.",
      ja: "組織を作成すると、イベントの公開、チェックイン用QRコードの発行、リアルタイムの出席状況の把握を始められます。",
    },
    emptyAction: { en: "Create your first organization", ja: "最初の組織を作成" },
    orgNameLabel: { en: "Organization name", ja: "組織名" },
    orgNamePlaceholder: { en: "e.g. SRM NSCC", ja: "例: SRM NSCC" },
    createOrgError: { en: "Failed to create organization", ja: "組織の作成に失敗しました" },
  },
  orgDetail: {
    notFoundTitle: { en: "Organization not found", ja: "組織が見つかりません" },
    notFoundDescription: {
      en: "You may not be a member, or it doesn't exist.",
      ja: "メンバーではないか、この組織が存在しない可能性があります。",
    },
    newEvent: { en: "New event", ja: "新しいイベント" },
    statEvents: { en: "Events", ja: "イベント数" },
    statRegistrations: { en: "Registrations", ja: "登録者数" },
    statAttendance: { en: "Attendance", ja: "出席者数" },
    statAvgRate: { en: "Avg. attendance rate", ja: "平均出席率" },
    eventsHeading: { en: "Events", ja: "イベント" },
    emptyTitle: { en: "No events yet", ja: "イベントがまだありません" },
    emptyDescription: {
      en: "Create your first event — set the venue, geofence, and publish when ready.",
      ja: "最初のイベントを作成しましょう — 会場とジオフェンスを設定し、準備ができたら公開してください。",
    },
    createEvent: { en: "Create an event", ja: "イベントを作成" },
    registeredCount: { en: "{count} registered", ja: "登録 {count} 件" },
    attendedCount: { en: "{count} attended", ja: "出席 {count} 件" },
  },
  eventControl: {
    live: { en: "Live", ja: "ライブ" },
    polling: { en: "Polling", ja: "ポーリング中" },
    statRegistrations: { en: "Registrations", ja: "登録者数" },
    statAttendance: { en: "Attendance", ja: "出席者数" },
    statAttendanceRate: { en: "Attendance rate", ja: "出席率" },
    statNoShowRate: { en: "No-show rate", ja: "欠席率" },
    arrivalTimeline: { en: "Arrival timeline", ja: "到着タイムライン" },
    attendees: { en: "Attendees", ja: "参加者一覧" },
    transitionPublish: { en: "Publish", ja: "公開する" },
    transitionGoLive: { en: "Go live", ja: "開催を開始" },
    transitionMarkCompleted: { en: "Mark completed", ja: "終了にする" },
    transitionCancel: { en: "Cancel", ja: "中止する" },
    statusUpdateError: { en: "Failed to update event status", ja: "イベントのステータス更新に失敗しました" },
  },
  eventNew: {
    createKicker: { en: "Create", ja: "作成" },
    title: { en: "New event", ja: "新しいイベント" },
    subtitle: {
      en: "Set the venue geofence carefully — this is what verifies real attendance.",
      ja: "会場のジオフェンスは慎重に設定してください — これが実際の出席を検証する仕組みです。",
    },
    detailsHeading: { en: "Details", ja: "詳細情報" },
    eventNameLabel: { en: "Event name", ja: "イベント名" },
    descriptionLabel: { en: "Description", ja: "説明" },
    venueLabel: { en: "Venue name", ja: "会場名" },
    venuePlaceholder: { en: "e.g. Tech Park Auditorium", ja: "例: テックパーク講堂" },
    startsLabel: { en: "Starts", ja: "開始日時" },
    endsLabel: { en: "Ends", ja: "終了日時" },
    capacityLabel: { en: "Capacity (optional)", ja: "定員（任意）" },
    geofenceHeading: { en: "Geofence", ja: "ジオフェンス" },
    locating: { en: "Locating…", ja: "位置情報を取得中…" },
    useMyLocation: { en: "Use my current location", ja: "現在地を使用" },
    latitudeLabel: { en: "Latitude", ja: "緯度" },
    longitudeLabel: { en: "Longitude", ja: "経度" },
    radiusLabel: { en: "Geofence radius (meters)", ja: "ジオフェンス半径（メートル）" },
    radiusHelp: {
      en: "Attendees must be within this radius (widened slightly for their device's own GPS uncertainty) to check in.",
      ja: "参加者はチェックインするためにこの半径内にいる必要があります（各デバイスのGPS誤差を考慮し、わずかに広めに判定されます）。",
    },
    rotationLabel: { en: "QR rotation interval", ja: "QR更新間隔" },
    rotationHelp: {
      en: "How often the displayed check-in QR code refreshes — you can change this later too.",
      ja: "表示されるチェックイン用QRコードが更新される頻度です — 後からいつでも変更できます。",
    },
    submit: { en: "Create event (draft)", ja: "イベントを作成（下書き）" },
    createError: { en: "Failed to create event", ja: "イベントの作成に失敗しました" },
  },
  eventDiscover: {
    kicker: { en: "Live right now", ja: "現在開催中" },
    title: { en: "Discover events", ja: "イベントを探す" },
    subtitle: {
      en: "Published and currently active events across all organizations.",
      ja: "すべての組織の、公開中および開催中のイベント一覧です。",
    },
    emptyTitle: { en: "No events published yet", ja: "公開されているイベントはまだありません" },
    emptyDescription: {
      en: "Check back soon, or ask an organizer to publish one.",
      ja: "しばらくしてから確認するか、主催者にイベントの公開を依頼してください。",
    },
    registeredOf: { en: "{count}/{capacity} registered", ja: "登録 {count}/{capacity} 名" },
  },
  eventDetail: {
    notFoundTitle: { en: "Event not found", ja: "イベントが見つかりません" },
    notFoundDescription: {
      en: "This event doesn't exist, or you don't have access to it.",
      ja: "このイベントは存在しないか、アクセス権がありません。",
    },
    checkInWithQr: { en: "Check in with QR", ja: "QRでチェックイン" },
    registerToAttend: { en: "Register to attend", ja: "参加登録する" },
    registeredCount: { en: "{count} registered", ja: "登録 {count} 名" },
    registeredWithCapacity: { en: "{count} registered / {capacity} capacity", ja: "登録 {count} / 定員 {capacity} 名" },
    attendedCount: { en: "{count} attended", ja: "出席 {count} 名" },
    geofenceNote: {
      en: "You must be within ~{radius}m of this location (plus your device's GPS margin) to check in.",
      ja: "チェックインするには、この場所から約{radius}m以内（デバイスのGPS誤差を含む）にいる必要があります。",
    },
    registrationFailed: { en: "Registration failed", ja: "登録に失敗しました" },
  },
  myEvents: {
    kicker: { en: "Your presence, tracked", ja: "あなたの出席記録" },
    title: { en: "My events", ja: "マイイベント" },
    subtitle: {
      en: "Everything you've registered for, and everywhere you've checked in — in one place.",
      ja: "登録したイベントとチェックイン履歴を、まとめて確認できます。",
    },
    browseMore: { en: "Browse more events", ja: "他のイベントを探す" },
    emptyTitle: { en: "Nothing here yet", ja: "まだ何もありません" },
    emptyDescription: {
      en: "Register for an event from Discover and it'll show up here, along with your check-in status.",
      ja: "「探す」からイベントに登録すると、チェックイン状況とともにここに表示されます。",
    },
    upcoming: { en: "Upcoming", ja: "今後の予定" },
    past: { en: "Past", ja: "過去のイベント" },
  },
  attend: {
    defaultTitle: { en: "Check in", ja: "チェックイン" },
    subheading: { en: "Verify your presence with QR + location.", ja: "QRコードと位置情報であなたの存在を証明します。" },
    scanHint: { en: "Point your camera at the organizer's check-in QR display.", ja: "主催者が表示するチェックイン用QRコードにカメラを向けてください。" },
    locateHint: {
      en: "QR verified. Now share your location to confirm you're at the venue.",
      ja: "QRコードを確認しました。会場にいることを確認するため、位置情報を共有してください。",
    },
    shareLocation: { en: "Share my location", ja: "位置情報を共有" },
    confirmHint: { en: "Location captured (±{accuracy}m accuracy). Confirm check-in?", ja: "位置情報を取得しました（誤差 ±{accuracy}m）。チェックインを確定しますか？" },
    confirmAttendance: { en: "Confirm attendance", ja: "出席を確定" },
    invalidQr: { en: "That QR code doesn't look like a valid Kehai Engine check-in code.", ja: "このQRコードは有効な気配エンジンのチェックインコードではないようです。" },
    geoUnavailable: { en: "Geolocation is not available on this device/browser.", ja: "このデバイス・ブラウザでは位置情報を利用できません。" },
    locationError: { en: "Location error: {message}", ja: "位置情報エラー: {message}" },
    attendanceConfirmed: { en: "Attendance confirmed", ja: "出席が確認されました" },
    distanceFromVenue: {
      en: "You were {distance}m from the venue ({confidence} location confidence).",
      ja: "会場から{distance}mの地点でした（位置情報の確度: {confidence}）。",
    },
    distanceTooFar: {
      en: "You appear to be {distance}m from the venue — move closer and try again.",
      ja: "会場から{distance}m離れているようです — 近づいてからもう一度お試しください。",
    },
    checkInFailed: { en: "Check-in failed.", ja: "チェックインに失敗しました。" },
    cameraError: {
      en: "Camera access denied or unavailable. You can also open the check-in link directly.",
      ja: "カメラへのアクセスが拒否されたか利用できません。チェックイン用リンクを直接開くこともできます。",
    },
  },
  auth: {
    loginKicker: { en: "Welcome back", ja: "おかえりなさい" },
    loginTitle: { en: "Sign in", ja: "ログイン" },
    loginSubtitle: { en: "Access your organizer console or attendee account.", ja: "主催者コンソールまたは参加者アカウントにアクセスします。" },
    emailLabel: { en: "Email", ja: "メールアドレス" },
    passwordLabel: { en: "Password", ja: "パスワード" },
    signInButton: { en: "Sign in", ja: "ログイン" },
    noAccount: { en: "No account?", ja: "アカウントをお持ちでないですか？" },
    createOne: { en: "Create one", ja: "新規登録" },
    registerKicker: { en: "Get started", ja: "はじめる" },
    registerTitle: { en: "Create your account", ja: "アカウントを作成" },
    registerSubtitle: {
      en: "Start an organization or register for events as an attendee.",
      ja: "組織を立ち上げるか、参加者としてイベントに登録しましょう。",
    },
    fullNameLabel: { en: "Full name", ja: "氏名" },
    passwordHint: { en: "At least 8 characters.", ja: "8文字以上で入力してください。" },
    createAccountButton: { en: "Create account", ja: "アカウントを作成" },
    haveAccount: { en: "Already have an account?", ja: "すでにアカウントをお持ちですか？" },
    genericError: { en: "Something went wrong", ja: "問題が発生しました" },
  },
  attendeeTable: {
    searchPlaceholder: { en: "Search name or email…", ja: "名前またはメールアドレスで検索…" },
    filterAll: { en: "All", ja: "すべて" },
    filterAttended: { en: "Attended", ja: "出席済み" },
    filterNotAttended: { en: "Not attended", ja: "未出席" },
    noMatch: { en: "No registrants match.", ja: "該当する登録者がいません。" },
    colName: { en: "Name", ja: "名前" },
    colEmail: { en: "Email", ja: "メールアドレス" },
    colStatus: { en: "Status", ja: "ステータス" },
    colCheckedIn: { en: "Checked in", ja: "チェックイン時刻" },
    colDistance: { en: "Distance", ja: "距離" },
  },
  aiInsights: {
    heading: { en: "AI Insights", ja: "AIインサイト" },
    providerConnected: { en: "provider connected", ja: "プロバイダー接続済み" },
    noProvider: { en: "no AI provider configured", ja: "AIプロバイダー未設定" },
    generateHint: {
      en: "Generate a grounded interpretation of this event's exact attendance metrics.",
      ja: "このイベントの正確な出席データに基づいた分析を生成します。",
    },
    generateButton: { en: "Generate insights", ja: "インサイトを生成" },
    analyzing: { en: "Analyzing…", ja: "分析中…" },
    recommendationLabel: { en: "Recommendation — ", ja: "提案 — " },
    aiInterpreted: { en: "AI-interpreted", ja: "AIによる解釈" },
    deterministicFallback: { en: "Deterministic fallback (AI unavailable)", ja: "決定論的フォールバック（AI利用不可）" },
    cachedSuffix: { en: " · cached", ja: " ・キャッシュ済み" },
    anomaliesHeading: { en: "Anomalies detected", ja: "検出された異常" },
    anomaliesNote: { en: "Deterministic rule-based detection — not AI-generated.", ja: "ルールベースの決定論的検出であり、AI生成ではありません。" },
    askHeading: { en: "Ask your attendance data", ja: "出席データに質問する" },
    askPlaceholder: { en: "e.g. Which event had the highest attendance rate?", ja: "例: 最も出席率が高かったイベントは？" },
    askButton: { en: "Ask", ja: "質問する" },
    askError: { en: "Could not answer that.", ja: "その質問には回答できませんでした。" },
  },
  qrPanel: {
    inactiveHint: {
      en: "Publish or activate this event to generate its check-in QR code.",
      ja: "チェックイン用QRコードを発行するには、このイベントを公開または開催中にしてください。",
    },
    heading: { en: "Check-in QR", ja: "チェックイン用QR" },
    refreshingIn: { en: "refreshing in {seconds}s", ja: "{seconds}秒後に更新" },
    altText: { en: "Event check-in QR code", ja: "イベントのチェックイン用QRコード" },
    rotationNote: {
      en: "This code rotates automatically. A screenshot of it goes stale within one rotation window, and every scan is still checked against the venue geofence server-side.",
      ja: "このコードは自動的に更新されます。スクリーンショットは1回の更新周期以内に無効になり、すべてのスキャンはサーバー側で会場のジオフェンスと照合されます。",
    },
    refreshNow: { en: "Refresh now", ja: "今すぐ更新" },
    changeRotation: { en: "Change rotation", ja: "更新間隔を変更" },
    closeSettings: { en: "Close", ja: "閉じる" },
    rotationIntervalLabel: { en: "Rotation interval", ja: "更新間隔" },
    rotationTakesEffect: {
      en: "Takes effect on the next refresh — safe to change any time, even while the event is live.",
      ja: "次回の更新時に反映されます — イベント開催中であっても、いつでも安全に変更できます。",
    },
    qrLoadError: { en: "Could not load QR code", ja: "QRコードを読み込めませんでした" },
    rotationUpdateError: { en: "Could not update rotation interval", ja: "更新間隔を変更できませんでした" },
  },
  qrRotation: {
    customLabel: { en: "Custom", ja: "カスタム" },
    unitSec: { en: "sec", ja: "秒" },
    unitMin: { en: "min", ja: "分" },
    unitHr: { en: "hr", ja: "時間" },
  },
  exportButtons: {
    csv: { en: "Export CSV", ja: "CSVをエクスポート" },
    excel: { en: "Export Excel", ja: "Excelをエクスポート" },
  },
  chart: {
    empty: { en: "No check-ins recorded yet.", ja: "まだチェックインが記録されていません。" },
    start: { en: "start", ja: "開始" },
    checkins: { en: "{count} check-ins", ja: "{count} 件のチェックイン" },
    minutesFromStart: { en: "{signed} min from start", ja: "開始から{signed}分" },
  },
  classroomHub: {
    kicker: { en: "Recurring attendance", ja: "継続的な出席管理" },
    title: { en: "Classrooms", ja: "クラス" },
    subtitle: {
      en: "Track a semester's attendance with a recurring daily QR + geofence check-in — for every class you teach or join.",
      ja: "毎日のQR＋ジオフェンスによるチェックインで、学期を通じた出席を記録します — 担当・受講するすべてのクラスで。",
    },
    teachingHeading: { en: "Teaching", ja: "担当クラス" },
    teachingEmptyTitle: { en: "No classrooms yet", ja: "クラスがまだありません" },
    teachingEmptyDescription: {
      en: "Create a classroom to get a join code, a recurring check-in QR, and a live attendance heatmap.",
      ja: "クラスを作成すると、参加コード、繰り返し使えるチェックイン用QR、リアルタイムの出席ヒートマップが手に入ります。",
    },
    newClassroom: { en: "New classroom", ja: "新しいクラス" },
    nameLabel: { en: "Classroom name", ja: "クラス名" },
    namePlaceholder: { en: "e.g. Data Structures — Section B", ja: "例: データ構造 — Bクラス" },
    courseCodeLabel: { en: "Course code (optional)", ja: "科目コード（任意）" },
    courseCodePlaceholder: { en: "e.g. CS201", ja: "例: CS201" },
    semesterLabelLabel: { en: "Semester (optional)", ja: "学期（任意）" },
    semesterPlaceholder: { en: "e.g. Fall 2026", ja: "例: 2026年秋学期" },
    geofenceHeading: { en: "Geofence (optional)", ja: "ジオフェンス（任意）" },
    geofenceHelp: {
      en: "Leave this off if students may check in from anywhere — for example an online or hybrid class.",
      ja: "オンライン授業やハイブリッド授業など、場所を問わずチェックインしてよい場合は設定不要です。",
    },
    enableGeofence: { en: "Require students to be on campus", ja: "学生に構内からのチェックインを義務付ける" },
    useMyLocation: { en: "Use my current location", ja: "現在地を使用" },
    locating: { en: "Locating…", ja: "位置情報を取得中…" },
    latitudeLabel: { en: "Latitude", ja: "緯度" },
    longitudeLabel: { en: "Longitude", ja: "経度" },
    radiusLabel: { en: "Geofence radius (meters)", ja: "ジオフェンス半径（メートル）" },
    createError: { en: "Failed to create classroom", ja: "クラスの作成に失敗しました" },
    studentCount: { en: "{count} students", ja: "学生 {count} 名" },
    sessionCount: { en: "{count} sessions", ja: "セッション {count} 回" },
    joinCodeLabel: { en: "Join code", ja: "参加コード" },
    copyCode: { en: "Copy code", ja: "コードをコピー" },
    copyLink: { en: "Copy link", ja: "リンクをコピー" },
    copied: { en: "Copied!", ja: "コピーしました！" },
    enrolledHeading: { en: "Enrolled", ja: "受講中のクラス" },
    enrolledEmptyTitle: { en: "Not enrolled in any classroom", ja: "受講中のクラスはありません" },
    enrolledEmptyDescription: {
      en: "Join a classroom with the 6-character code your teacher shares.",
      ja: "先生から共有された6文字のコードで、クラスに参加しましょう。",
    },
    teacherLabel: { en: "Taught by {name}", ja: "担当: {name}" },
    attendanceRate: { en: "Attendance rate", ja: "出席率" },
    currentStreak: { en: "Current streak", ja: "現在の連続出席" },
    joinHeading: { en: "Join a classroom", ja: "クラスに参加する" },
    joinSubtitle: {
      en: "Enter the 6-character code your teacher gave you.",
      ja: "先生から伝えられた6文字のコードを入力してください。",
    },
  },
  classroomDetail: {
    notFoundTitle: { en: "Classroom not found", ja: "クラスが見つかりません" },
    notFoundDescription: {
      en: "You may not be enrolled or teaching this classroom, or it doesn't exist.",
      ja: "このクラスの受講者・担当教員ではないか、クラスが存在しない可能性があります。",
    },
    studentCountLabel: { en: "Students", ja: "学生数" },
    sessionsHeading: { en: "Sessions", ja: "セッション" },
    sessionLabelPlaceholder: {
      en: "Session name (optional) — e.g. Lecture, Quiz",
      ja: "セッション名（任意）— 例：講義、小テスト",
    },
    startSession: { en: "Start a new session", ja: "新しいセッションを開始" },
    endSession: { en: "End session", ja: "セッションを終了" },
    restartSession: { en: "Restart", ja: "再開" },
    untitledSession: { en: "Untitled session", ja: "無題のセッション" },
    noSessionsYet: { en: "No sessions yet.", ja: "まだセッションがありません。" },
    presentCount: { en: "{count} checked in", ja: "{count} 名出席" },
    sessionOpenBadge: { en: "Open", ja: "開催中" },
    sessionStartError: { en: "Failed to start the session", ja: "セッションの開始に失敗しました" },
    sessionEndError: { en: "Failed to end the session", ja: "セッションの終了に失敗しました" },
    sessionRestartError: { en: "Failed to restart the session", ja: "セッションの再開に失敗しました" },
    shareHeading: { en: "Share join access", ja: "参加コードの共有" },
    rosterHeading: { en: "Roster", ja: "受講者一覧" },
    heatmapHeading: { en: "Attendance", ja: "出席状況" },
    checkInNow: { en: "Check in now", ja: "今すぐチェックイン" },
    noOpenSessionHint: {
      en: "No session is open right now — check back once your teacher starts one.",
      ja: "現在開催中のセッションはありません — 先生がセッションを開始するまでお待ちください。",
    },
    toastJoined: { en: "{name} just joined!", ja: "{name} さんが参加しました！" },
    toastCheckedIn: { en: "{name} checked in", ja: "{name} さんがチェックインしました" },
    backToClassView: { en: "← Back to class view", ja: "← クラス全体表示に戻る" },
    viewingStudent: { en: "Viewing {name}'s attendance", ja: "{name} さんの出席状況を表示中" },
  },
  classroomCheckin: {
    subheading: { en: "Verify your presence with QR + location.", ja: "QRコードと位置情報であなたの存在を証明します。" },
    subheadingNoGeofence: { en: "Verify your presence by scanning today's QR code.", ja: "本日のQRコードをスキャンして出席を証明します。" },
    scanHint: { en: "Point your camera at the teacher's check-in QR display.", ja: "先生が表示するチェックイン用QRコードにカメラを向けてください。" },
    locateHint: {
      en: "QR verified. Now share your location to confirm you're in class.",
      ja: "QRコードを確認しました。教室にいることを確認するため、位置情報を共有してください。",
    },
    shareLocation: { en: "Share my location", ja: "位置情報を共有" },
    confirmHint: { en: "Location captured (±{accuracy}m accuracy). Confirm check-in?", ja: "位置情報を取得しました（誤差 ±{accuracy}m）。チェックインを確定しますか？" },
    confirmHintNoGeofence: { en: "Confirm today's check-in?", ja: "本日のチェックインを確定しますか？" },
    confirmAttendance: { en: "Confirm attendance", ja: "出席を確定" },
    invalidQr: { en: "That QR code doesn't look like a valid classroom check-in code.", ja: "このQRコードは有効なクラスのチェックインコードではないようです。" },
    geoUnavailable: { en: "Geolocation is not available on this device/browser.", ja: "このデバイス・ブラウザでは位置情報を利用できません。" },
    locationError: { en: "Location error: {message}", ja: "位置情報エラー: {message}" },
    attendanceConfirmed: { en: "Attendance confirmed", ja: "出席が確認されました" },
    distanceFromClass: {
      en: "You were {distance}m from class ({confidence} location confidence).",
      ja: "教室から{distance}mの地点でした（位置情報の確度: {confidence}）。",
    },
    distanceTooFar: {
      en: "You appear to be {distance}m from class — move closer and try again.",
      ja: "教室から{distance}m離れているようです — 近づいてからもう一度お試しください。",
    },
    checkInFailed: { en: "Check-in failed.", ja: "チェックインに失敗しました。" },
    noOpenSession: { en: "There's no open session for this classroom right now.", ja: "現在、このクラスに開催中のセッションはありません。" },
  },
  heatmap: {
    legendLess: { en: "Less", ja: "少ない" },
    legendMore: { en: "More", ja: "多い" },
    statCurrentStreak: { en: "Current streak", ja: "現在の連続出席" },
    statLongestStreak: { en: "Longest streak", ja: "最長連続出席" },
    statPresentDays: { en: "Present days", ja: "出席日数" },
    statTotalSessions: { en: "Total sessions", ja: "セッション総数" },
    statAttendanceRate: { en: "Attendance rate", ja: "出席率" },
    daysUnit: { en: "days", ja: "日" },
  },
  joinClassroomForm: {
    codeLabel: { en: "6-character code", ja: "6文字のコード" },
    codePlaceholder: { en: "ABC123", ja: "ABC123" },
    submit: { en: "Join classroom", ja: "クラスに参加" },
    joinError: { en: "Couldn't join that classroom — check the code and try again.", ja: "クラスに参加できませんでした — コードを確認してもう一度お試しください。" },
  },
  classroomJoinPage: {
    kicker: { en: "Join a classroom", ja: "クラスに参加" },
    title: { en: "Join a classroom", ja: "クラスに参加する" },
    subtitle: {
      en: "Enter the 6-character code your teacher shared with you.",
      ja: "先生から共有された6文字のコードを入力してください。",
    },
  },
  classroomRoster: {
    searchPlaceholder: { en: "Search name or email…", ja: "名前またはメールアドレスで検索…" },
    noMatch: { en: "No students match.", ja: "該当する学生がいません。" },
    colName: { en: "Name", ja: "名前" },
    colEmail: { en: "Email", ja: "メールアドレス" },
    colPresent: { en: "Present", ja: "出席日数" },
    colTotal: { en: "Total", ja: "総日数" },
    colRate: { en: "Rate", ja: "出席率" },
    colLastAttended: { en: "Last attended", ja: "最終出席" },
    viewHeatmap: { en: "View heatmap", ja: "ヒートマップを見る" },
    never: { en: "Never", ja: "なし" },
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

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

interface LocaleState {
  locale: Locale;
  toggle: () => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
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
      t: (path: string, vars?: Record<string, string | number>) => interpolate(resolve(path, locale), vars),
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

"use client";

import { createContext, useContext, useMemo, useState } from "react";

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
    legal: { en: "Legal", ja: "利用規約・プライバシー" },
    privacyPolicy: { en: "Privacy & terms", ja: "プライバシーと利用規約" },
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
    statCompleted: { en: "Completed", ja: "終了済み" },
    statRecurringRate: { en: "Repeat attendees", ja: "リピート参加率" },
    trendHeading: { en: "Attendance trend", ja: "出席率の推移" },
    eventsHeading: { en: "Events", ja: "イベント" },
    searchPlaceholder: { en: "Search events…", ja: "イベントを検索…" },
    noMatchTitle: { en: "No matching events", ja: "一致するイベントがありません" },
    noMatchDescription: { en: "Try a different search term.", ja: "別のキーワードをお試しください。" },
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
    transitionRestart: { en: "Restart", ja: "再開" },
    statusUpdateError: { en: "Failed to update event status", ja: "イベントのステータス更新に失敗しました" },
    windowWarningNotOpen: {
      en: "This event is marked live, but check-in doesn't open until {time} — attendees will see \"check-in has not opened yet\" until then.",
      ja: "このイベントはライブと表示されていますが、チェックインは{time}まで開始されません — それまで参加者には「チェックインはまだ開始されていません」と表示されます。",
    },
    windowWarningClosed: {
      en: "This event is still marked live, but its check-in window closed at {time} — attendees will see \"check-in has closed\" if they try now.",
      ja: "このイベントは引き続きライブと表示されていますが、チェックイン受付は{time}に終了しました — 今チェックインしようとした参加者には「チェックインは終了しました」と表示されます。",
    },
    extendPrompt: { en: "Extend check-in by:", ja: "チェックインを延長:" },
    extendBy15: { en: "+15 min", ja: "+15分" },
    extendBy30: { en: "+30 min", ja: "+30分" },
    extendBy60: { en: "+1 hour", ja: "+1時間" },
    extendError: { en: "Failed to extend the check-in window", ja: "チェックイン受付の延長に失敗しました" },
    editDetails: { en: "Edit details", ja: "詳細を編集" },
    editTiming: { en: "Edit timing", ja: "日時を編集" },
    saveChanges: { en: "Save changes", ja: "変更を保存" },
    editSaved: { en: "Saved", ja: "保存しました" },
    editError: { en: "Failed to save changes", ja: "変更の保存に失敗しました" },
    editLockedHint: {
      en: "This event is completed or cancelled and can no longer be edited.",
      ja: "このイベントは終了または中止されているため、編集できません。",
    },
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
    noEndTime: { en: "No fixed end time", ja: "終了時刻を設定しない" },
    noEndTimeHint: {
      en: "Check-in stays open indefinitely instead of closing at a set time — good for ongoing or open-schedule events. You can always set an end time later.",
      ja: "決まった時刻で締め切らず、チェックインを無期限に受け付けます — 継続的な開催やスケジュール未定のイベントに向いています。終了時刻は後からいつでも設定できます。",
    },
    capacityLabel: { en: "Capacity (optional)", ja: "定員（任意）" },
    geofenceHeading: { en: "Venue location", ja: "会場の位置" },
    locating: { en: "Locating…", ja: "位置情報を取得中…" },
    useMyLocation: { en: "Use my current location", ja: "現在地を使用" },
    locationSetHint: {
      en: "Location captured. This is what attendees will be checked against when they scan the QR code.",
      ja: "位置情報を取得しました。参加者がQRコードをスキャンする際、この位置と照合されます。",
    },
    locationNotSetHint: {
      en: "Stand at the venue and tap the button above, or enter coordinates manually if you're setting this up ahead of time.",
      ja: "会場に立って上のボタンをタップするか、事前に設定する場合は座標を手動で入力してください。",
    },
    enterManually: { en: "Enter coordinates manually", ja: "座標を手動で入力" },
    latitudeLabel: { en: "Latitude", ja: "緯度" },
    longitudeLabel: { en: "Longitude", ja: "経度" },
    advancedSettings: { en: "Advanced settings", ja: "詳細設定" },
    advancedSettingsHint: {
      en: "Sensible defaults are already set — only open this if you need to change them.",
      ja: "すでに適切な初期値が設定されています — 変更が必要な場合のみ開いてください。",
    },
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
    searchPlaceholder: { en: "Search by name, venue, organizer…", ja: "名前・会場・主催者で検索…" },
    filterAll: { en: "All", ja: "すべて" },
    noMatchTitle: { en: "No matching events", ja: "一致するイベントがありません" },
    noMatchDescription: {
      en: "Try a different search term or filter.",
      ja: "別のキーワードやフィルターをお試しください。",
    },
  },
  eventDetail: {
    backToDiscover: { en: "← All events", ja: "← イベント一覧に戻る" },
    notFoundTitle: { en: "Event not found", ja: "イベントが見つかりません" },
    notFoundDescription: {
      en: "This event doesn't exist, or you don't have access to it.",
      ja: "このイベントは存在しないか、アクセス権がありません。",
    },
    checkInWithQr: { en: "Check in with QR", ja: "QRでチェックイン" },
    registerToAttend: { en: "Register to attend", ja: "参加登録する" },
    addToCalendar: { en: "+ Add to calendar", ja: "+ カレンダーに追加" },
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
    reconnecting: {
      en: "Connection trouble — retrying automatically ({attempt}/{max})…",
      ja: "接続が不安定です — 自動的に再試行しています（{attempt}/{max}）…",
    },
    connectionFailed: {
      en: "Couldn't reach the server after several tries. Your location is still saved — check your connection and try again.",
      ja: "何度か試しましたがサーバーに接続できませんでした。位置情報は保持されています — 接続を確認してもう一度お試しください。",
    },
    windowNotOpenTitle: { en: "Check-in hasn't opened yet", ja: "チェックインはまだ開始されていません" },
    windowNotOpenBody: {
      en: "This event shows as live, but check-in opens at {time}. Come back then — no action needed from you right now.",
      ja: "このイベントはライブと表示されていますが、チェックインの開始は{time}です。その時間になったら再度お試しください — 今は何もする必要はありません。",
    },
    windowClosedTitle: { en: "Check-in window has closed", ja: "チェックインの受付は終了しました" },
    windowClosedBody: {
      en: "This event still shows as live, but its check-in window closed at {time}. Ask the organizer to extend the event or restart it if you need to check in.",
      ja: "このイベントは引き続きライブと表示されていますが、チェックインの受付は{time}に終了しました。チェックインが必要な場合は、主催者にイベントの延長または再開を依頼してください。",
    },
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
    fullNameLabel: { en: "Display name", ja: "表示名" },
    displayNameHint: {
      en: "This is what other people will see — on rosters, attendee lists, and event dashboards.",
      ja: "受講者一覧、参加者リスト、イベントダッシュボードなど、他の人に表示される名前です。",
    },
    passwordHint: { en: "At least 8 characters.", ja: "8文字以上で入力してください。" },
    createAccountButton: { en: "Create account", ja: "アカウントを作成" },
    haveAccount: { en: "Already have an account?", ja: "すでにアカウントをお持ちですか？" },
    genericError: { en: "Something went wrong", ja: "問題が発生しました" },
    forgotPassword: { en: "Forgot password?", ja: "パスワードをお忘れですか？" },
    forgotPasswordKicker: { en: "Account recovery", ja: "アカウントの復旧" },
    forgotPasswordTitle: { en: "Reset your password", ja: "パスワードをリセット" },
    forgotPasswordSubtitle: {
      en: "Enter the email on your account and we'll send you a link to set a new password.",
      ja: "アカウントのメールアドレスを入力すると、新しいパスワードを設定するためのリンクをお送りします。",
    },
    forgotPasswordSubmit: { en: "Send reset link", ja: "リセットリンクを送信" },
    forgotPasswordSent: {
      en: "If an account exists for that email, a reset link is on its way. Check your inbox.",
      ja: "そのメールアドレスのアカウントが存在する場合、リセットリンクをお送りしました。受信箱をご確認ください。",
    },
    backToSignIn: { en: "← Back to sign in", ja: "← ログインに戻る" },
    resetPasswordKicker: { en: "Account recovery", ja: "アカウントの復旧" },
    resetPasswordTitle: { en: "Set a new password", ja: "新しいパスワードを設定" },
    newPasswordLabel: { en: "New password", ja: "新しいパスワード" },
    confirmPasswordLabel: { en: "Confirm new password", ja: "新しいパスワード（確認）" },
    resetPasswordSubmit: { en: "Set new password", ja: "新しいパスワードを設定" },
    resetPasswordDone: {
      en: "Your password has been changed. You've been signed out everywhere for your security — sign in again with your new password.",
      ja: "パスワードが変更されました。セキュリティのため、すべての端末からサインアウトされました。新しいパスワードで再度ログインしてください。",
    },
    passwordMismatch: { en: "Passwords don't match", ja: "パスワードが一致しません" },
    resetPasswordInvalidTitle: { en: "Invalid reset link", ja: "無効なリセットリンク" },
    resetPasswordInvalidDescription: {
      en: "This password reset link is missing its token — request a new one.",
      ja: "このパスワードリセットリンクにはトークンが含まれていません。新しいリンクをリクエストしてください。",
    },
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
    markPresent: { en: "Mark present", ja: "出席にする" },
    overrideError: { en: "Failed to mark attendee present", ja: "出席の記録に失敗しました" },
    flaggedTitle: { en: "Flagged for review", ja: "確認が必要としてマークされました" },
    flagReason_impossible_travel: {
      en: "Checked in somewhere they couldn't have physically reached in time since their last check-in",
      ja: "前回のチェックインから物理的に到達不可能な速さで別の場所からチェックインしています",
    },
    flagReason_duplicate_location: {
      en: "Checked in from the exact same spot as another attendee within minutes",
      ja: "数分以内に他の参加者と全く同じ場所からチェックインしています",
    },
    flagReason_zero_accuracy: {
      en: "Device reported implausibly exact GPS accuracy — sometimes seen with spoofed locations",
      ja: "デバイスが不自然なほど正確なGPS精度を報告しています — 位置情報の偽装で見られることがあります",
    },
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
    refreshingIn: { en: "refreshing in {time}", ja: "{time}後に更新" },
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
    needMoreSessions: { en: "Trend appears after a couple of sessions.", ja: "セッションが2回以上たまるとトレンドが表示されます。" },
    presentOfEnrolled: { en: "{present}/{total} enrolled present", ja: "在籍{total}名中{present}名出席" },
    needMoreEvents: { en: "Trend appears after a couple of events.", ja: "イベントが2件以上たまるとトレンドが表示されます。" },
    attendedOfRegistered: { en: "{attended}/{total} registered attended", ja: "登録{total}名中{attended}名出席" },
  },
  classroomHub: {
    kicker: { en: "Recurring attendance", ja: "継続的な出席管理" },
    title: { en: "Classrooms", ja: "クラス" },
    subtitle: {
      en: "Track a semester's attendance with a recurring daily QR + geofence check-in — for every class you teach or join.",
      ja: "毎日のQR＋ジオフェンスによるチェックインで、学期を通じた出席を記録します — 担当・受講するすべてのクラスで。",
    },
    teachingHeading: { en: "Classes you teach", ja: "担当クラス" },
    joinClassroom: { en: "Join a classroom", ja: "クラスに参加" },
    searchPlaceholder: { en: "Search your classes…", ja: "クラスを検索…" },
    noMatchTitle: { en: "No matching classes", ja: "一致するクラスがありません" },
    noMatchDescription: { en: "Try a different search term.", ja: "別のキーワードをお試しください。" },
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
    enrolledHeading: { en: "Your classes", ja: "受講中のクラス" },
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
    sessionActions: { en: "Session actions", ja: "セッションの操作" },
    sessionStartError: { en: "Failed to start the session", ja: "セッションの開始に失敗しました" },
    sessionEndError: { en: "Failed to end the session", ja: "セッションの終了に失敗しました" },
    sessionRestartError: { en: "Failed to restart the session", ja: "セッションの再開に失敗しました" },
    renameSession: { en: "Rename", ja: "名前を変更" },
    sessionRenamePlaceholder: { en: "Session name", ja: "セッション名" },
    saveRename: { en: "Save", ja: "保存" },
    cancelRename: { en: "Cancel", ja: "キャンセル" },
    sessionRenameError: { en: "Failed to rename the session", ja: "セッション名の変更に失敗しました" },
    deleteSession: { en: "Delete", ja: "削除" },
    confirmDeleteSession: { en: "Delete for good?", ja: "完全に削除しますか？" },
    sessionDeleteError: { en: "Failed to delete the session", ja: "セッションの削除に失敗しました" },
    shareHeading: { en: "Share join access", ja: "参加コードの共有" },
    rosterHeading: { en: "Roster", ja: "受講者一覧" },
    heatmapHeading: { en: "Attendance", ja: "出席状況" },
    trendHeading: { en: "Attendance trend", ja: "出席率の推移" },
    myAttendanceHeading: { en: "My attendance", ja: "自分の出席記録" },
    checkInNow: { en: "Check in now", ja: "今すぐチェックイン" },
    noOpenSessionHint: {
      en: "No session is open right now — check back once your teacher starts one.",
      ja: "現在開催中のセッションはありません — 先生がセッションを開始するまでお待ちください。",
    },
    toastJoined: { en: "{name} just joined!", ja: "{name} さんが参加しました！" },
    toastCheckedIn: { en: "{name} checked in", ja: "{name} さんがチェックインしました" },
    backToClassView: { en: "← Back to class view", ja: "← クラス全体表示に戻る" },
    backToClassrooms: { en: "← All classrooms", ja: "← クラス一覧に戻る" },
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
    reconnecting: {
      en: "Connection trouble — retrying automatically ({attempt}/{max})…",
      ja: "接続が不安定です — 自動的に再試行しています（{attempt}/{max}）…",
    },
    connectionFailed: {
      en: "Couldn't reach the server after several tries. Your location is still saved — check your connection and try again.",
      ja: "何度か試しましたがサーバーに接続できませんでした。位置情報は保持されています — 接続を確認してもう一度お試しください。",
    },
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
  myAttendance: {
    empty: { en: "No sessions have happened yet.", ja: "まだセッションが開催されていません。" },
    present: { en: "Present", ja: "出席" },
    absent: { en: "Absent", ja: "欠席" },
    markedByTeacher: { en: "marked by teacher", ja: "教員が記録" },
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
    colToday: { en: "Today", ja: "本日" },
    present: { en: "Present", ja: "出席済み" },
    markPresent: { en: "Mark present", ja: "出席にする" },
    overrideError: { en: "Failed to mark student present", ja: "出席の記録に失敗しました" },
  },
  atRisk: {
    heading: { en: "Attendance risk", ja: "出席リスク" },
    presentOf: { en: "{present}/{total} sessions", ja: "{total}回中{present}回出席" },
    viewRoster: { en: "View full roster →", ja: "全員の名簿を見る →" },
  },
  legal: {
    kicker: { en: "Legal", ja: "法的情報" },
    title: { en: "Privacy & terms", ja: "プライバシーと利用規約" },
    subtitle: {
      en: "What this app collects, why, and what you're agreeing to by using it. Plain language, no fine print games.",
      ja: "このアプリが何を収集し、なぜ収集するのか、そして利用にあたって同意いただく内容です。難解な表現は使いません。",
    },
    aboutHeading: { en: "Who runs this", ja: "運営について" },
    aboutBody: {
      en: "Kehai Engine is an independent, solo-built project — not a company, with no support SLA. It's offered free of charge, as-is, with no warranty of any kind. If something breaks, the best way to reach the maintainer is a GitHub issue on the source repository (linked in the footer).",
      ja: "気配エンジンは個人が単独で開発した独立プロジェクトであり、企業ではなく、サポートのSLAもありません。無償かつ現状のまま提供され、いかなる保証もありません。不具合があった場合は、フッターにリンクされているソースリポジトリへのGitHub Issueが開発者への最も確実な連絡手段です。",
    },
    collectHeading: { en: "What is collected", ja: "収集する情報" },
    collectIdentity: {
      en: "Your name, email, and password hash (or, for Google sign-in, your Google account id/email/name/picture) — for login and identifying you to organizers.",
      ja: "氏名、メールアドレス、パスワードのハッシュ（Googleログインの場合はGoogleアカウントID・メールアドレス・氏名・プロフィール画像）— ログインおよび主催者への本人特定のために使用します。",
    },
    collectOrg: {
      en: "Which organizations and events/classrooms you're a member of or registered for.",
      ja: "所属する組織、登録済みのイベントやクラスの情報。",
    },
    collectLocation: {
      en: "GPS coordinates at the moment of check-in only — never tracked continuously or in the background — rounded to about 1.1m precision, plus the device's own reported accuracy and computed distance from the venue.",
      ja: "チェックインの瞬間のGPS座標のみ — 継続的またはバックグラウンドでの追跡は一切行いません — 約1.1m精度に丸めた上で、デバイスが報告する精度と会場からの距離を保存します。",
    },
    collectFlags: {
      en: "A small set of honest anomaly signals computed at check-in (e.g. an implausible travel speed since your last check-in, or landing on the exact same GPS fix as another attendee). These are shown only to the event's organizer as a flag to review — they never block a check-in on their own, and can be wrong.",
      ja: "チェックイン時に計算される、誠実な異常検知シグナルの一部（例：前回のチェックインから物理的にありえない移動速度、他の参加者と全く同じGPS座標での記録など）。これらはイベント主催者にのみ確認用のフラグとして表示され、単独でチェックインをブロックすることはなく、誤検知の可能性もあります。",
    },
    notCollectedHeading: { en: "What is deliberately not collected", ja: "意図的に収集しない情報" },
    notCollectedBody: {
      en: "No continuous or background location tracking, no device fingerprinting, no ad tracking, and raw attendee data (names, emails, coordinates) is never sent to the AI provider — only already-aggregated statistics are.",
      ja: "継続的またはバックグラウンドでの位置情報追跡、デバイスフィンガープリンティング、広告トラッキングは一切行いません。また、参加者の生データ（氏名、メールアドレス、座標）がAIプロバイダーに送信されることはなく、すでに集計済みの統計情報のみが送信されます。",
    },
    limitationsHeading: { en: "Known limitations (stated honestly)", ja: "既知の制約（正直にお伝えします）" },
    limitationsBody: {
      en: "Geofence + QR verification proves the reported device location and a valid, time-scoped code were both presented — it is not a claim of spoof-proof presence. A device with a mocked GPS provider can misreport its location, the same limitation every consumer app using browser geolocation has. Treat this as a strong signal, not absolute proof.",
      ja: "ジオフェンスとQRコードによる検証は、報告されたデバイスの位置情報と有効な時限付きコードの両方が提示されたことを証明しますが、位置情報の偽装が不可能であることを保証するものではありません。位置情報を偽装するデバイスは誤った位置を報告できる可能性があり、これはブラウザの位置情報機能を利用するすべてのコンシューマーアプリに共通する制約です。強力な参考情報として扱ってください、絶対的な証拠としてではなく。",
    },
    retentionHeading: { en: "Retention", ja: "データの保持期間" },
    retentionBody: {
      en: "Attendance and location records are kept for the lifetime of the event or classroom record, since they're the auditable basis for an attendance decision. Refresh tokens are revoked on logout and expire after 30 days.",
      ja: "出席記録および位置情報は、出席判定の根拠となる監査データであるため、イベントまたはクラスの記録が存在する限り保持されます。リフレッシュトークンはログアウト時に無効化され、30日で期限切れとなります。",
    },
    fullDocLink: {
      en: "The full technical privacy model, including exactly what code enforces each of these points, is documented in PRIVACY.md in the source repository.",
      ja: "各項目をどのコードが実際に担保しているかを含む、技術的な詳細はソースリポジトリのPRIVACY.mdに記載されています。",
    },
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
  // Reading localStorage inside a plain useEffect meant the app's very
  // first render was ALWAYS "en" (the literal default above), correcting
  // to the stored "ja" a moment later via a second render — every
  // consumer, including the locale toggle's own sliding thumb, briefly
  // saw the wrong locale and then visibly animated to the right one. A
  // lazy useState initializer runs synchronously during that first
  // render instead, so a returning Japanese-locale user's very first
  // committed state is already "ja" — nothing to correct, nothing to
  // animate. (A hard page reload still has an unavoidable flash of the
  // server-rendered default before this client code runs at all; this
  // fixes every render after that, including every client-side
  // navigation, which is what was reported.)
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ja") return stored;
    } catch {
      // ignore — localStorage unavailable
    }
    return "en";
  });

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

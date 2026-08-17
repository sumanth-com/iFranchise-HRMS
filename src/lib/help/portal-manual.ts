/**
 * Shared help-manual types. Copy only — never include route links.
 */

export type ManualFeatureIcon =
  | "gauge"
  | "zap"
  | "user"
  | "users"
  | "badge"
  | "log-in"
  | "history"
  | "wrench"
  | "receipt"
  | "archive"
  | "book"
  | "files"
  | "download"
  | "wallet"
  | "plus"
  | "list"
  | "scroll"
  | "target"
  | "activity"
  | "message"
  | "users-round"
  | "trending"
  | "laptop"
  | "info"
  | "bell"
  | "clock"
  | "sliders"
  | "shield"
  | "layout"
  | "alert"
  | "search"
  | "git-branch"
  | "calendar"
  | "filter"
  | "check"
  | "file-text"
  | "briefcase"
  | "user-search"
  | "mic"
  | "handshake"
  | "bar-chart"
  | "pie"
  | "line-chart"
  | "building"
  | "user-plus"
  | "check-square"
  | "map-pin"
  | "gift"
  | "banknote"
  | "package"
  | "key"
  | "compare"
  | "plug"
  | "clipboard";

export type ManualSectionIcon =
  | "layout"
  | "user"
  | "calendar-check"
  | "wallet"
  | "file-text"
  | "calendar-days"
  | "target"
  | "laptop"
  | "bell"
  | "settings"
  | "users"
  | "briefcase"
  | "bar-chart"
  | "building"
  | "shield"
  | "user-plus"
  | "check-square"
  | "clipboard"
  | "package"
  | "banknote";

export type ManualFeature = {
  name: string;
  detail: string;
  tip: string;
  icon: ManualFeatureIcon;
};

export type ManualSection = {
  id: string;
  group: string;
  title: string;
  summary: string;
  useful: string;
  howTo: string;
  icon: ManualSectionIcon;
  features: ManualFeature[];
};

export type PortalManual = {
  title: string;
  description: string;
  sections: ManualSection[];
};

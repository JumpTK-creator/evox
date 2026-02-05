/**
 * EVOX Design System Components
 * Central export for all EVOX-specific components
 */

// Status & Indicators
export { StatusDot, getStatusColor, normalizeStatus } from "./StatusDot";
export { StatusBadge } from "./StatusBadge";
export { AgentStatusIndicator } from "./AgentStatusIndicator";

// Cards & Containers
export { AgentCard, extractKeywords, generateSummary } from "./AgentCard";
export { MetricCard, MetricInline } from "./MetricCard";
export { Panel, PanelSection } from "./Panel";

// Content
export { Keyword, KeywordList } from "./Keyword";
export { EmptyState, EmptyStateInline } from "./EmptyState";
export { Loading, LoadingPage, Skeleton, SkeletonCard } from "./Loading";

// Feeds & Lists
export { ActivityFeed } from "./ActivityFeed";
export { CommunicationLog } from "./CommunicationLog";

// Navigation
export { ViewTabs } from "./ViewTabs";

// Dashboards
export { CEODashboard } from "./CEODashboard";
export { LiveDashboard } from "./LiveDashboard";

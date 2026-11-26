export type AdminScreen =
  | 'dashboard'
  | 'create-tournament'
  | 'manage-tournaments'
  | 'users'
  | 'withdrawals'
  | 'deposits'
  | 'results'
  | 'banner-notice'
  | 'payment-settings'
  | 'managers'
  | 'activity-logs';

export type AdminRole = 'super_admin' | 'lobby_manager';
export type AssignedLobby = 'all' | 'solo' | 'duo' | 'squad' | 'custom';
export type ManagerLobbyChoice = Exclude<AssignedLobby, 'all'>;

export const TOURNAMENT_MODES = [
  'SOLO',
  'DUO',
  'SQUAD',
  'CUSTOM',
  'FULL MAP',
  'CS LOBBY',
  'LW LOBBY',
  'SNIPER LOBBY',
  'CS ONE TAP',
  'LW ONE TAP',
  'FREE',
  '1VS1 HIGH',
  'SURVIVAL',
  'LONE WOLF',
  '4V4 LOBBY',
  'ONE TAP',
] as const;

export type TournamentMode = (typeof TOURNAMENT_MODES)[number];
export type TournamentStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

const LEGACY_MODE_MAP: Record<string, TournamentMode> = {
  'CS 1VS1': 'CS LOBBY',
  'LW 1VS1': 'LW LOBBY',
  'LOSS TO WIN': 'SNIPER LOBBY',
  'CS 2VS2': 'CS ONE TAP',
  'LW 2VS2': 'LW ONE TAP',
  '1VS1 HEAD': 'FREE',
};

export function normalizeTournamentMode(mode: string): TournamentMode {
  const upper = String(mode || '').trim().toUpperCase();
  if (LEGACY_MODE_MAP[upper]) return LEGACY_MODE_MAP[upper];
  if ((TOURNAMENT_MODES as readonly string[]).includes(upper)) {
    return upper as TournamentMode;
  }
  return 'FULL MAP';
}

export const LOBBY_CONFIG: Record<
  ManagerLobbyChoice,
  {
    label: string;
    shortLabel: string;
    defaultMode: TournamentMode;
    defaultSlots: string;
    modes: TournamentMode[];
  }
> = {
  solo: {
    label: 'SOLO Lobby',
    shortLabel: 'SOLO',
    defaultMode: 'SOLO',
    defaultSlots: '48',
    modes: ['SOLO', 'CS LOBBY', 'LW LOBBY', 'FREE', '1VS1 HIGH'],
  },
  duo: {
    label: 'DUO Lobby',
    shortLabel: 'DUO',
    defaultMode: 'DUO',
    defaultSlots: '24',
    modes: ['DUO', 'CS ONE TAP', 'LW ONE TAP'],
  },
  squad: {
    label: 'SQUAD Lobby',
    shortLabel: 'SQUAD',
    defaultMode: 'SQUAD',
    defaultSlots: '48',
    modes: ['SQUAD', 'FULL MAP', 'SURVIVAL', '4V4 LOBBY'],
  },
  custom: {
    label: 'CUSTOM Lobby',
    shortLabel: 'CUSTOM',
    defaultMode: 'CUSTOM',
    defaultSlots: '12',
    modes: ['CUSTOM', 'SNIPER LOBBY', 'ONE TAP', 'LONE WOLF'],
  },
};

export function getLobbyAllowedModes(lobby: AssignedLobby): TournamentMode[] {
  if (lobby === 'all') return [...TOURNAMENT_MODES];
  return [...LOBBY_CONFIG[lobby].modes];
}

export function isModeInLobby(mode: string, lobby: AssignedLobby): boolean {
  if (lobby === 'all') return true;
  const normalized = normalizeTournamentMode(mode);
  return (LOBBY_CONFIG[lobby]?.modes || []).includes(normalized);
}

export function getLobbyShortLabel(lobby: AssignedLobby): string {
  if (lobby === 'all') return 'ALL LOBBIES';
  return LOBBY_CONFIG[lobby]?.shortLabel || 'CUSTOM';
}

export function getLobbyLabelForMode(mode: string): string {
  const normalized = normalizeTournamentMode(mode);
  if (LOBBY_CONFIG.solo.modes.includes(normalized)) return 'SOLO';
  if (LOBBY_CONFIG.duo.modes.includes(normalized)) return 'DUO';
  if (LOBBY_CONFIG.squad.modes.includes(normalized)) return 'SQUAD';
  if (LOBBY_CONFIG.custom.modes.includes(normalized)) return 'CUSTOM';
  return normalized;
}

export function sanitizeMobileDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function formatManagerEmailFromMobile(mobile: string): string {
  const digits = sanitizeMobileDigits(mobile);
  return `mgr_${digits}@manager.ffbattlezone.local`;
}

export interface AdminAccountRecord {
  id: string;
  uid: string;
  email: string;
  name?: string;
  mobile?: string;
  role?: AdminRole;
  assigned_lobby?: AssignedLobby;
  is_active?: boolean;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface AdminActivityLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: AdminRole;
  assignedLobby: AssignedLobby;
  actionType: string;
  summary: string;
  tournamentId?: string;
  tournamentName?: string;
  lobbyMode?: string;
  createdAt?: FirestoreTimestampLike;
}

export interface FirestoreTimestampLike {
  toDate?: () => Date;
  toMillis?: () => number;
  seconds?: number;
}

export interface Tournament {
  id: string;
  name: string;
  mode: TournamentMode;
  map: string;
  entryFee: number;
  perKillPrize: number;
  prizePool: number;
  slotsTotal: number;
  slotsFilled: number;
  matchDate: string;
  matchTime: string;
  matchTimestampMs: number;
  status: TournamentStatus;
  image: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface TournamentRoom {
  roomId: string;
  roomPassword: string;
  updatedAt?: FirestoreTimestampLike;
}

export interface TournamentJoin {
  id: string;
  tournamentId: string;
  tournamentName: string;
  mode: TournamentMode;
  map: string;
  matchTimestampMs: number;
  userId: string;
  userName: string;
  ffUid: string;
  slotNumber: number;
  entryPaid: number;
  kills: number;
  prizeWon: number;
  status: 'joined' | 'refunded' | 'settled';
  createdAt?: FirestoreTimestampLike;
}

export interface UserRecord {
  id: string;
  uid: string;
  name: string;
  ffUid: string;
  phone?: string;
  email?: string;
  walletBalance: number;
  winningBalance?: number;
  totalWinnings: number;
  totalAdded: number;
  rank: string;
  matches: number;
  wins: number;
  kills: number;
  banned: boolean;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  ffUid?: string;
  paymentMethod?: string;
  accountHolder?: string;
  phoneNumber?: string;
  upiId: string;
  amount: number;
  coinsDeducted?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  ffUid: string;
  amount: number;
  paymentApp: string;
  senderUpi?: string;
  utrNumber: string;
  screenshotData: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  title: string;
  type: 'credit' | 'debit';
  category: 'topup' | 'entry' | 'refund' | 'prize' | 'withdraw';
  amount: number;
  status: 'completed' | 'pending' | 'rejected';
  referenceId?: string;
  createdAt?: FirestoreTimestampLike;
}

export interface PaymentSettings {
  depositUpiId: string;
  depositPayeeName: string;
  depositQrImage?: string;
  depositNote?: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
  withdrawMethods: string;
  withdrawTime: string;
  withdrawNote?: string;
}

export interface BannerNoticeSettings {
  noticeText: string;
  noticeEnabled: boolean;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerImage?: string;
  bannerEnabled: boolean;
}

export interface BannerItem {
  id: string;
  background_image: string;
  small_text: string;
  big_text: string;
  description_text: string;
  banner_link: string;
  is_active: boolean;
  banner_image?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}



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

export const ADMIN_LOBBIES = [
  'FULL MAP',
  'CS LOBBY',
  'LW LOBBY',
  'SNIPER LOBBY',
  'CS ONE TAP',
  'LW ONE TAP',
  'FREE',
  '1VS1 HIGH',
  'SURVIVAL',
] as const;

export const TOURNAMENT_MODES = ADMIN_LOBBIES;

export type TournamentMode = (typeof ADMIN_LOBBIES)[number];
export type ManagerLobbyChoice = TournamentMode;
export type AssignedLobby = 'ALL' | ManagerLobbyChoice;
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
  if ((ADMIN_LOBBIES as readonly string[]).includes(upper)) {
    return upper as TournamentMode;
  }
  return 'FULL MAP';
}

export function normalizeAssignedLobby(lobby?: string): AssignedLobby {
  const upper = String(lobby || '').trim().toUpperCase();
  if (upper === 'ALL') return 'ALL';
  if ((ADMIN_LOBBIES as readonly string[]).includes(upper)) {
    return upper as ManagerLobbyChoice;
  }
  return 'FULL MAP';
}

export function getDefaultSlotsForLobby(lobby: TournamentMode): string {
  if (lobby === 'FULL MAP' || lobby === 'SURVIVAL') return '48';
  if (lobby === 'CS ONE TAP' || lobby === 'LW ONE TAP') return '4';
  return '2';
}

export function getLobbyAllowedModes(lobby: AssignedLobby): TournamentMode[] {
  if (lobby === 'ALL') return [...ADMIN_LOBBIES];
  return [lobby];
}

export function isModeInLobby(mode: string, lobby: AssignedLobby): boolean {
  if (lobby === 'ALL') return true;
  return normalizeTournamentMode(mode) === lobby;
}

export function getLobbyShortLabel(lobby: AssignedLobby): string {
  if (lobby === 'ALL') return 'ALL LOBBIES';
  return lobby;
}

export function getLobbyLabelForMode(mode: string): string {
  return normalizeTournamentMode(mode);
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
  assigned_lobby?: AssignedLobby | string;
  is_active?: boolean;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface AdminActivityLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: AdminRole;
  assignedLobby: AssignedLobby | string;
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

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
  | 'referrals'
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
export type AssignedLobby = 'ALL' | TournamentMode[];
export type TournamentStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export const MATCH_TYPES = ['Solo', 'Duo', 'Squad'] as const;
export type TournamentMatchType = (typeof MATCH_TYPES)[number];

export const TOURNAMENT_VERSIONS = ['TPP', 'FPP'] as const;
export type TournamentVersion = (typeof TOURNAMENT_VERSIONS)[number];

export const TOURNAMENT_MAPS = [
  'Bermuda',
  'Purgatory',
  'Kalahari',
  'Alpine',
  'NeXTerra',
  'Craftland',
] as const;

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

export function normalizeAssignedLobby(lobbyInput: unknown): AssignedLobby {
  if (lobbyInput === 'ALL' || lobbyInput === 'all') return 'ALL';
  if (Array.isArray(lobbyInput)) {
    const modes = lobbyInput
      .map((l) => String(l || '').trim().toUpperCase())
      .filter((l) => (ADMIN_LOBBIES as readonly string[]).includes(l)) as TournamentMode[];
    return modes.length > 0 ? modes : ['FULL MAP'];
  }
  const upper = String(lobbyInput || '').trim().toUpperCase();
  if ((ADMIN_LOBBIES as readonly string[]).includes(upper)) {
    return [upper as TournamentMode];
  }
  return 'ALL';
}

export function getDefaultSlotsForLobby(lobby: TournamentMode): string {
  if (lobby === 'FULL MAP' || lobby === 'SURVIVAL') return '48';
  if (lobby === 'CS ONE TAP' || lobby === 'LW ONE TAP') return '4';
  return '2';
}

export function getLobbyAllowedModes(lobby: AssignedLobby): TournamentMode[] {
  if (lobby === 'ALL') return [...ADMIN_LOBBIES];
  if (Array.isArray(lobby)) return [...lobby];
  return [lobby];
}

export function isModeInLobby(mode: string, lobby: AssignedLobby): boolean {
  if (lobby === 'ALL') return true;
  const normalized = normalizeTournamentMode(mode);
  if (Array.isArray(lobby)) {
    return lobby.includes(normalized);
  }
  return normalized === lobby;
}

export function getLobbyShortLabel(lobby: AssignedLobby): string {
  if (lobby === 'ALL') return 'ALL LOBBIES';
  if (Array.isArray(lobby)) return lobby.join(', ');
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

export function getManagerLobbiesList(m: Partial<AdminAccountRecord>): TournamentMode[] {
  if (Array.isArray(m.assignedLobbies) && m.assignedLobbies.length > 0) {
    return m.assignedLobbies
      .map((l) => normalizeTournamentMode(String(l)))
      .filter((v, idx, arr) => arr.indexOf(v) === idx);
  }
  const legacy = m.assignedLobby || m.assigned_lobby;
  if (legacy && String(legacy).trim().toUpperCase() !== 'ALL') {
    return [normalizeTournamentMode(String(legacy))];
  }
  return [];
}

export interface AdminAccountRecord {
  id: string;
  uid: string;
  email: string;
  name?: string;
  mobile?: string;
  role?: AdminRole | 'manager';
  assigned_lobby?: string;
  assignedLobby?: string;
  assignedLobbies?: TournamentMode[];
  is_active?: boolean;
  isActive?: boolean;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface AdminActivityLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: AdminRole;
  assignedLobby: AssignedLobby | string | string[];
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
  lobbyType?: string;
  matchType?: TournamentMatchType;
  version?: TournamentVersion;
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
  createdByUid?: string;
  createdByName?: string;
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
  bonusBalance?: number;
  totalWinnings: number;
  totalAdded: number;
  referCode?: string;
  referredBy?: string;
  referredByCode?: string;
  referralBonusEarned?: number;
  referralCount?: number;
  lastRefundJoinId?: string;
  rank: string;
  matches: number;
  wins: number;
  kills: number;
  banned: boolean;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

export interface ReferCodeEntry {
  id: string;
  code: string;
  uid: string;
  name: string;
  createdAt?: FirestoreTimestampLike;
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referrerName: string;
  referrerCode: string;
  referredUid: string;
  referredName: string;
  referredEmail?: string;
  referredSignupBonus: number;
  referrerBonusAmount: number;
  hasDeposited: boolean;
  firstDepositAmount?: number;
  firstDepositId?: string;
  referrerBonusStatus: 'pending' | 'paid';
  createdAt?: FirestoreTimestampLike;
  bonusPaidAt?: FirestoreTimestampLike;
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
  utrNumber?: string;
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
  category: 'topup' | 'entry' | 'refund' | 'prize' | 'withdraw' | 'bonus';
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

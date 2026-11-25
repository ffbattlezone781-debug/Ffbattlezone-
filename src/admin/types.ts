export type AdminScreen =
  | 'dashboard'
  | 'create-tournament'
  | 'manage-tournaments'
  | 'users'
  | 'withdrawals'
  | 'deposits'
  | 'results'
  | 'banner-notice'
  | 'payment-settings';

export type TournamentMode = 'SOLO' | 'DUO' | 'SQUAD' | 'LONE WOLF' | '4V4 LOBBY' | 'ONE TAP';
export type TournamentStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

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

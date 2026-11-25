import React, { Component, useCallback, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Award,
  CheckCircle2,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  PlusCircle,
  QrCode,
  Settings,
  ShieldAlert,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  getWithdrawableBalance,
  handleFirestoreError,
  MAP_IMAGES,
  OperationType,
  testConnection,
} from './firebase';
import type {
  AdminScreen,
  BannerItem,
  BannerNoticeSettings,
  DepositRequest,
  PaymentSettings,
  Tournament,
  TournamentJoin,
  TournamentRoom,
  UserRecord,
  WalletTransaction,
  WithdrawalRequest,
} from './types';
import { DashboardHome } from './components/DashboardHome';
import {
  CreateTournamentScreen,
  type CreateTournamentPayload,
} from './components/CreateTournamentScreen';
import {
  ManageTournamentsScreen,
  type EditTournamentPayload,
} from './components/ManageTournamentsScreen';
import { ManageUsersScreen } from './components/ManageUsersScreen';
import { WithdrawalsScreen } from './components/WithdrawalsScreen';
import {
  ResultsPrizeScreen,
  type DistributePrizePayload,
} from './components/ResultsPrizeScreen';
import {
  BannerNoticeScreen,
  type SaveBannerPayload,
} from './components/BannerNoticeScreen';
import {
  DepositsScreen,
  PaymentSettingsScreen,
} from './components/DepositsAndPaymentScreen';

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  depositUpiId: 'ffbattlezone@okaxis',
  depositPayeeName: 'FF BATTLE ZONE ARENA',
  depositQrImage: '',
  depositNote:
    'Pay via PhonePe only (QR / UPI), then submit your 12-digit UTR & payment screenshot for Admin approval.',
  minDeposit: 10,
  maxDeposit: 10000,
  minWithdraw: 20,
  maxWithdraw: 5000,
  withdrawMethods: 'PhonePe',
  withdrawTime: '15-30 Mins (0% Fee)',
  withdrawNote:
    'Only Winning Coins can be withdrawn. Deposited coins are for tournament entry only.',
};

const DEFAULT_BANNER_NOTICE: BannerNoticeSettings = {
  noticeText: 'WELCOME TO FF BATTLE ZONE · INSTANT WITHDRAWAL & DAILY CUSTOM ROOMS LIVE',
  noticeEnabled: true,
  bannerTitle: 'WIN BIG DAILY',
  bannerSubtitle: 'Join Solo, Duo & Squad Free Fire tournaments with instant UPI payouts.',
  bannerImage: '',
  bannerEnabled: true,
};

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AdminErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred in Admin Panel.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] p-6 text-white">
          <div className="w-full max-w-md rounded-2xl border border-[#FF3B30]/40 bg-[#12182B] p-6 text-center">
            <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[#FF3B30]" />
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Admin Workspace Error
            </h1>
            <p className="mt-2 break-words text-xs text-slate-300">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-[#FF6B00] px-5 text-sm font-bold text-white"
            >
              Reload Control Center
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface NavItem {
  id: AdminScreen;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export const AdminApp: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // Navigation & UI state
  const [activeScreen, setActiveScreen] = useState<AdminScreen>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Firestore Collections State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(
    DEFAULT_PAYMENT_SETTINGS
  );
  const [bannerNotice, setBannerNotice] = useState<BannerNoticeSettings>(DEFAULT_BANNER_NOTICE);
  const [banners, setBanners] = useState<BannerItem[]>([]);

  const showToast = useCallback((msg: string, tone: 'success' | 'error' = 'success') => {
    setToast({ msg, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(id);
  }, [toast]);

  // Verify Firestore connection on mount
  useEffect(() => {
    void testConnection();
  }, []);

  // Strict Admin Auth Gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsAuthorizedAdmin(false);
        setAuthLoading(false);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        const normalizedEmail = (user.email || '').toLowerCase();
        const emailWhitelisted =
          (normalizedEmail === 'ffbattlezone781@gmail.com' ||
            normalizedEmail === 'admin@gmail.com') &&
          Boolean(user.emailVerified);

        const verifiedAdmin = adminSnap.exists() || emailWhitelisted;
        setIsAuthorizedAdmin(verifiedAdmin);
      } catch {
        setIsAuthorizedAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Attach Real-time Listeners ONLY when verified Admin
  useEffect(() => {
    if (!isAuthorizedAdmin) {
      setUsers([]);
      setTournaments([]);
      setWithdrawals([]);
      setDepositRequests([]);
      setTransactions([]);
      setBanners([]);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UserRecord, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setUsers(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    );

    const unsubTournaments = onSnapshot(
      collection(db, 'tournaments'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Tournament, 'id'>),
        }));
        list.sort((a, b) => (b.matchTimestampMs || 0) - (a.matchTimestampMs || 0));
        setTournaments(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tournaments');
      }
    );

    const unsubWithdrawals = onSnapshot(
      collection(db, 'withdrawals'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WithdrawalRequest, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setWithdrawals(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'withdrawals');
      }
    );

    const unsubDeposits = onSnapshot(
      collection(db, 'deposit_requests'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DepositRequest, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setDepositRequests(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'deposit_requests');
      }
    );

    const unsubTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WalletTransaction, 'id'>),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setTransactions(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      }
    );

    const unsubPayment = onSnapshot(
      doc(db, 'settings', 'payment'),
      (snap) => {
        if (snap.exists()) {
          setPaymentSettings({
            ...DEFAULT_PAYMENT_SETTINGS,
            ...(snap.data() as Partial<PaymentSettings>),
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/payment');
      }
    );

    const unsubBanner = onSnapshot(
      doc(db, 'settings', 'banner_notice'),
      (snap) => {
        if (snap.exists()) {
          setBannerNotice({
            ...DEFAULT_BANNER_NOTICE,
            ...(snap.data() as Partial<BannerNoticeSettings>),
          });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'settings/banner_notice');
      }
    );

    const unsubBanners = onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          ...(d.data() as BannerItem),
          id: d.id,
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
        setBanners(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'banners');
      }
    );

    return () => {
      unsubUsers();
      unsubTournaments();
      unsubWithdrawals();
      unsubDeposits();
      unsubTransactions();
      unsubPayment();
      unsubBanner();
      unsubBanners();
    };
  }, [isAuthorizedAdmin]);

  /* ============================================================
     AUTH HANDLERS
  ============================================================ */
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const email = loginEmail.trim();
    if (!email || !loginPass) {
      setLoginError('Enter admin email and password.');
      return;
    }
    setLoginBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, loginPass);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setLoginError('');
    setLoginBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  /* ============================================================
     TOURNAMENT ACTIONS
  ============================================================ */
  async function handleCreateTournament(payload: CreateTournamentPayload): Promise<boolean> {
    setBusyId('create-tournament');
    try {
      const dt = new Date(payload.dateTimeLocal);
      const matchTimestampMs = Number.isFinite(dt.getTime())
        ? dt.getTime()
        : Date.now() + 3600 * 1000;
      const matchDate = dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const matchTime = dt.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const id = `t_${Date.now()}`;
      const batch = writeBatch(db);
      batch.set(doc(db, 'tournaments', id), {
        name: payload.name.slice(0, 64),
        mode: payload.mode,
        map: payload.map,
        entryFee: payload.entryFee,
        perKillPrize: payload.perKillPrize,
        prizePool: payload.winnerPrize,
        slotsTotal: payload.slotsTotal,
        slotsFilled: 0,
        matchDate: matchDate.slice(0, 24),
        matchTime: matchTime.slice(0, 24),
        matchTimestampMs,
        status: payload.status,
        image: MAP_IMAGES[payload.map] || MAP_IMAGES.Bermuda,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (payload.roomId.length >= 3 && payload.roomPassword.length >= 2) {
        batch.set(doc(db, 'tournaments', id, 'private', 'room'), {
          roomId: payload.roomId.slice(0, 32),
          roomPassword: payload.roomPassword.slice(0, 32),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      showToast(`Tournament "${payload.name}" published live!`);
      setActiveScreen('manage-tournaments');
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to publish tournament.', 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleGoLive(t: Tournament) {
    setBusyId(`live-${t.id}`);
    try {
      await updateDoc(doc(db, 'tournaments', t.id), {
        status: 'live',
        updatedAt: serverTimestamp(),
      });
      showToast(`${t.name} is now LIVE!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status update failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const handleFetchTournamentDetails = useCallback(async (tId: string) => {
    let room: TournamentRoom | null = null;
    try {
      const rSnap = await getDoc(doc(db, 'tournaments', tId, 'private', 'room'));
      if (rSnap.exists()) {
        room = rSnap.data() as TournamentRoom;
      }
    } catch {
      room = null;
    }

    const joinsSnap = await getDocs(
      query(collection(db, 'joins'), where('tournamentId', '==', tId))
    );
    const joins = joinsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<TournamentJoin, 'id'>) }))
      .sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

    return { room, joins };
  }, []);

  const handleLoadJoinsOnly = useCallback(
    async (tId: string): Promise<TournamentJoin[]> => {
      const { joins } = await handleFetchTournamentDetails(tId);
      return joins;
    },
    [handleFetchTournamentDetails]
  );

  async function handleSaveRoomOnly(tId: string, roomId: string, roomPassword: string) {
    if (roomId.trim().length < 3 || roomPassword.trim().length < 2) {
      showToast('Room ID (min 3 chars) and Password (min 2 chars) required.', 'error');
      return;
    }
    setBusyId(`room-${tId}`);
    try {
      await setDoc(doc(db, 'tournaments', tId, 'private', 'room'), {
        roomId: roomId.trim().slice(0, 32),
        roomPassword: roomPassword.trim().slice(0, 32),
        updatedAt: serverTimestamp(),
      });
      showToast('Room ID & Password saved for joined players!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save Room ID.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveTournamentEdit(payload: EditTournamentPayload): Promise<boolean> {
    setBusyId(`edit-${payload.id}`);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'tournaments', payload.id), {
        name: payload.name.slice(0, 64),
        mode: payload.mode,
        map: payload.map,
        entryFee: payload.entryFee,
        perKillPrize: payload.perKillPrize,
        prizePool: payload.prizePool,
        slotsTotal: payload.slotsTotal,
        status: payload.status,
        matchDate: payload.matchDate.slice(0, 24),
        matchTime: payload.matchTime.slice(0, 24),
        matchTimestampMs: payload.matchTimestampMs,
        image: MAP_IMAGES[payload.map] || MAP_IMAGES.Bermuda,
        updatedAt: serverTimestamp(),
      });

      if (payload.roomId.length >= 3 && payload.roomPassword.length >= 2) {
        batch.set(doc(db, 'tournaments', payload.id, 'private', 'room'), {
          roomId: payload.roomId.slice(0, 32),
          roomPassword: payload.roomPassword.slice(0, 32),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      showToast(`Updated "${payload.name}"!`);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save changes.', 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelAndRefundAll(t: Tournament) {
    setBusyId(`refund-${t.id}`);
    try {
      const joinsSnap = await getDocs(
        query(collection(db, 'joins'), where('tournamentId', '==', t.id))
      );
      const batch = writeBatch(db);
      let refundedCount = 0;

      for (const jDoc of joinsSnap.docs) {
        const j = jDoc.data() as TournamentJoin;
        if (j.status === 'joined' && Number(j.entryPaid) > 0) {
          const uSnap = await getDoc(doc(db, 'users', j.userId));
          if (uSnap.exists()) {
            const uData = uSnap.data() as UserRecord;
            batch.update(doc(db, 'users', j.userId), {
              walletBalance: Number(uData.walletBalance || 0) + Number(j.entryPaid),
              updatedAt: serverTimestamp(),
            });
          }
          batch.set(doc(collection(db, 'transactions')), {
            userId: j.userId,
            title: `Refund: ${String(t.name).slice(0, 50)} Cancelled`.slice(0, 80),
            type: 'credit',
            category: 'refund',
            amount: Number(j.entryPaid),
            status: 'completed',
            referenceId: t.id,
            createdAt: serverTimestamp(),
          });
          refundedCount += 1;
        }
        batch.update(doc(db, 'joins', jDoc.id), { status: 'refunded' });
      }

      batch.update(doc(db, 'tournaments', t.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(`Cancelled "${t.name}" & refunded ${refundedCount} player(s)!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteTournament(t: Tournament) {
    setBusyId(`del-${t.id}`);
    try {
      const [joinsSnap, slotsSnap] = await Promise.all([
        getDocs(query(collection(db, 'joins'), where('tournamentId', '==', t.id))),
        getDocs(collection(db, 'tournaments', t.id, 'slots')),
      ]);

      const refsToDelete = [
        ...joinsSnap.docs.map((d) => d.ref),
        ...slotsSnap.docs.map((d) => d.ref),
        doc(db, 'tournaments', t.id, 'private', 'room'),
        doc(db, 'tournaments', t.id),
      ];

      for (let i = 0; i < refsToDelete.length; i += 400) {
        const batch = writeBatch(db);
        for (const ref of refsToDelete.slice(i, i + 400)) {
          batch.delete(ref);
        }
        await batch.commit();
      }

      showToast(`Deleted "${t.name}" and cleared ${joinsSnap.size} player booking(s).`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  /* ============================================================
     USER MANAGEMENT ACTIONS
  ============================================================ */
  async function handleToggleBanUser(user: UserRecord) {
    setBusyId(`ban-${user.id}`);
    try {
      const nextBan = !user.banned;
      await updateDoc(doc(db, 'users', user.id), {
        banned: nextBan,
        updatedAt: serverTimestamp(),
      });
      showToast(nextBan ? `${user.name} has been banned.` : `${user.name} unbanned.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ban update failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreditDeposit(user: UserRecord, amount: number, note?: string) {
    const cleanAmount = Math.floor(Number(amount));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      showToast('Enter a valid coin amount greater than 0.', 'error');
      return;
    }
    setBusyId(`user-credit-${user.id}`);
    try {
      const uSnap = await getDoc(doc(db, 'users', user.id));
      if (!uSnap.exists()) return;
      const uData = uSnap.data() as UserRecord;
      const txTitle = (note?.trim() ? `Admin Credit: ${note.trim()}` : 'Admin Manual Deposit Credit').slice(0, 80);
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.id), {
        walletBalance: Number(uData.walletBalance || 0) + cleanAmount,
        totalAdded: Number(uData.totalAdded || 0) + cleanAmount,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'transactions')), {
        userId: user.id,
        title: txTitle.length >= 2 ? txTitle : 'Admin Manual Deposit Credit',
        type: 'credit',
        category: 'topup',
        amount: cleanAmount,
        status: 'completed',
        referenceId: `ADMIN-DEP-${Date.now()}`,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      showToast(`Added ₹${cleanAmount.toLocaleString('en-IN')} Play Coins to ${user.name}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Credit failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreditBonus(user: UserRecord, amount: number, note?: string) {
    const cleanAmount = Math.floor(Number(amount));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      showToast('Enter a valid coin amount greater than 0.', 'error');
      return;
    }
    setBusyId(`user-credit-${user.id}`);
    try {
      const uSnap = await getDoc(doc(db, 'users', user.id));
      if (!uSnap.exists()) return;
      const uData = uSnap.data() as UserRecord;
      const newBal = Number(uData.walletBalance || 0) + cleanAmount;
      const newWin = Math.max(0, Math.min(newBal, getWithdrawableBalance(uData) + cleanAmount));
      const txTitle = (note?.trim() ? `Admin Bonus: ${note.trim()}` : 'Admin Winning Bonus Credit').slice(0, 80);
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.id), {
        walletBalance: newBal,
        winningBalance: newWin,
        totalWinnings: Number(uData.totalWinnings || 0) + cleanAmount,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'transactions')), {
        userId: user.id,
        title: txTitle.length >= 2 ? txTitle : 'Admin Winning Bonus Credit',
        type: 'credit',
        category: 'prize',
        amount: cleanAmount,
        status: 'completed',
        referenceId: `ADMIN-WIN-${Date.now()}`,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      showToast(`Added ₹${cleanAmount.toLocaleString('en-IN')} Winning Coins to ${user.name}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bonus credit failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeductCoins(user: UserRecord, amount: number, note?: string) {
    const cleanAmount = Math.floor(Number(amount));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      showToast('Enter a valid coin amount greater than 0.', 'error');
      return;
    }
    setBusyId(`user-credit-${user.id}`);
    try {
      const uSnap = await getDoc(doc(db, 'users', user.id));
      if (!uSnap.exists()) return;
      const uData = uSnap.data() as UserRecord;
      const currBal = Number(uData.walletBalance || 0);
      if (currBal <= 0) {
        showToast(`${user.name} already has ₹0 balance.`, 'error');
        return;
      }
      const actualDeduct = Math.min(currBal, cleanAmount);
      const newBal = Math.max(0, currBal - actualDeduct);
      const currWin = getWithdrawableBalance(uData);
      const newWin = Math.max(0, Math.min(newBal, currWin));
      const txTitle = (note?.trim() ? `Admin Deduction: ${note.trim()}` : 'Admin Wallet Adjustment').slice(0, 80);

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.id), {
        walletBalance: newBal,
        winningBalance: newWin,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'transactions')), {
        userId: user.id,
        title: txTitle.length >= 2 ? txTitle : 'Admin Wallet Adjustment',
        type: 'debit',
        category: 'withdraw',
        amount: actualDeduct,
        status: 'completed',
        referenceId: `ADMIN-DED-${Date.now()}`,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      showToast(`Deducted ₹${actualDeduct.toLocaleString('en-IN')} from ${user.name}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Deduction failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  /* ============================================================
     WITHDRAWAL & DEPOSIT APPROVALS
  ============================================================ */
  async function handleApproveWithdrawal(w: WithdrawalRequest) {
    setBusyId(`wd-${w.id}`);
    try {
      const wRef = doc(db, 'withdrawals', w.id);
      const wSnap = await getDoc(wRef);
      if (!wSnap.exists()) return;
      const wData = wSnap.data() as WithdrawalRequest;
      if (wData.status !== 'pending') {
        showToast('Withdrawal already processed.', 'error');
        return;
      }

      const alreadyDeducted = wData.coinsDeducted === true;
      const batch = writeBatch(db);

      if (!alreadyDeducted) {
        const uRef = doc(db, 'users', w.userId);
        const uSnap = await getDoc(uRef);
        if (!uSnap.exists()) {
          showToast('User account not found.', 'error');
          return;
        }
        const uData = uSnap.data() as UserRecord;
        const currBal = Number(uData.walletBalance || 0);
        const currWin = getWithdrawableBalance(uData);

        if (currBal < wData.amount || currWin < wData.amount) {
          showToast(
            `Insufficient Winning Balance (₹${currWin}) for ₹${wData.amount} payout.`,
            'error'
          );
          return;
        }

        const newBal = Math.round((currBal - wData.amount) * 100) / 100;
        const newWin = Math.max(0, Math.min(newBal, Math.round((currWin - wData.amount) * 100) / 100));

        batch.update(uRef, {
          walletBalance: newBal,
          winningBalance: newWin,
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(wRef, {
        status: 'approved',
        adminNote: 'Paid via PhonePe',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'transactions')), {
        userId: wData.userId,
        title: `PhonePe Withdrawal Approved (${String(wData.upiId || '').slice(0, 36)})`.slice(0, 80),
        type: 'debit',
        category: 'withdraw',
        amount: wData.amount,
        status: 'completed',
        referenceId: w.id,
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(`Approved ₹${wData.amount} withdrawal for ${wData.userName}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectWithdrawal(w: WithdrawalRequest) {
    setBusyId(`wd-${w.id}`);
    try {
      const wRef = doc(db, 'withdrawals', w.id);
      const wSnap = await getDoc(wRef);
      if (!wSnap.exists()) return;
      const wData = wSnap.data() as WithdrawalRequest;
      if (wData.status !== 'pending') {
        showToast('Withdrawal already processed.', 'error');
        return;
      }

      const shouldRefund = wData.coinsDeducted === true;
      const batch = writeBatch(db);

      if (shouldRefund) {
        const uRef = doc(db, 'users', wData.userId);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const uData = uSnap.data() as UserRecord;
          const currBal = Number(uData.walletBalance || 0);
          const currWin = getWithdrawableBalance(uData);
          const refundAmt = Number(wData.amount || 0);
          const newBal = Math.round((currBal + refundAmt) * 100) / 100;
          const newWin = Math.min(newBal, Math.round((currWin + refundAmt) * 100) / 100);

          batch.update(uRef, {
            walletBalance: newBal,
            winningBalance: newWin,
            updatedAt: serverTimestamp(),
          });
          batch.set(doc(collection(db, 'transactions')), {
            userId: wData.userId,
            title: `Withdrawal Rejected Refund (${String(wData.upiId || '').slice(0, 32)})`.slice(0, 80),
            type: 'credit',
            category: 'refund',
            amount: refundAmt,
            status: 'completed',
            referenceId: w.id,
            createdAt: serverTimestamp(),
          });
        }
      }

      batch.update(wRef, {
        status: 'rejected',
        adminNote: shouldRefund ? 'Rejected by Admin (Coins Refunded)' : 'Rejected by Admin',
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(
        shouldRefund
          ? `Rejected withdrawal for ${wData.userName} & refunded ₹${wData.amount} to wallet!`
          : `Rejected withdrawal request for ${wData.userName}.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reject failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveDeposit(d: DepositRequest) {
    setBusyId(`dep-${d.id}`);
    try {
      const dRef = doc(db, 'deposit_requests', d.id);
      const dSnap = await getDoc(dRef);
      if (!dSnap.exists()) return;
      const dData = dSnap.data() as DepositRequest;
      if (dData.status !== 'pending') {
        showToast('Deposit request already processed.', 'error');
        return;
      }

      const uRef = doc(db, 'users', d.userId);
      const uSnap = await getDoc(uRef);
      if (!uSnap.exists()) {
        showToast('User profile not found.', 'error');
        return;
      }
      const uData = uSnap.data() as UserRecord;

      const batch = writeBatch(db);
      batch.update(dRef, {
        status: 'approved',
        adminNote: 'Verified & Credited',
        updatedAt: serverTimestamp(),
      });
      batch.update(uRef, {
        walletBalance: Number(uData.walletBalance || 0) + Number(d.amount),
        totalAdded: Number(uData.totalAdded || 0) + Number(d.amount),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'transactions')), {
        userId: d.userId,
        title: `QR Deposit Approved (${d.paymentApp})`.slice(0, 80),
        type: 'credit',
        category: 'topup',
        amount: d.amount,
        status: 'completed',
        referenceId: `UTR-${d.utrNumber}`.slice(0, 128),
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(`Approved ₹${d.amount} QR deposit for ${d.userName}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Deposit approval failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectDeposit(d: DepositRequest) {
    setBusyId(`dep-${d.id}`);
    try {
      await updateDoc(doc(db, 'deposit_requests', d.id), {
        status: 'rejected',
        adminNote: 'Invalid UTR or Screenshot',
        updatedAt: serverTimestamp(),
      });
      showToast(`Rejected QR deposit for ${d.userName}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reject failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  /* ============================================================
     RESULTS & PRIZE DISTRIBUTION
  ============================================================ */
  async function handleDistributePrize(payload: DistributePrizePayload): Promise<boolean> {
    setBusyId('distribute-prize');
    try {
      const batch = writeBatch(db);
      const winnerEntry =
        payload.entries.find((e) => e.isWinner) || payload.entries[0];

      const serializedEntries = payload.entries.map((item) => ({
        userId: item.join.userId,
        userName: item.join.userName,
        slotNumber: item.join.slotNumber,
        kills: item.kills,
        killPrize: item.killPrize,
        winnerBonus: item.winBonus,
        totalPrize: item.totalPrize,
      }));

      for (const item of payload.entries) {
        batch.update(doc(db, 'joins', item.join.id), {
          kills: item.kills,
          prizeWon: item.totalPrize,
          status: 'settled',
        });

        const uSnap = await getDoc(doc(db, 'users', item.join.userId));
        if (uSnap.exists()) {
          const u = uSnap.data() as UserRecord;
          const newWins = Number(u.wins || 0) + (item.isWinner ? 1 : 0);
          const newKills = Number(u.kills || 0) + item.kills;
          const newWinnings = Number(u.totalWinnings || 0) + item.totalPrize;
          const newBal = Number(u.walletBalance || 0) + item.totalPrize;
          const newWinBal = Math.max(
            0,
            Math.min(newBal, getWithdrawableBalance(u) + item.totalPrize)
          );

          batch.update(doc(db, 'users', item.join.userId), {
            walletBalance: newBal,
            winningBalance: newWinBal,
            totalWinnings: newWinnings,
            wins: newWins,
            kills: newKills,
            updatedAt: serverTimestamp(),
          });

          batch.set(doc(db, 'leaderboard', item.join.userId), {
            uid: item.join.userId,
            name: u.name,
            ffUid: u.ffUid,
            rank: u.rank || 'DIAMOND',
            matches: Number(u.matches || 0),
            wins: newWins,
            kills: newKills,
            totalWinnings: newWinnings,
            updatedAt: serverTimestamp(),
          });

          if (item.totalPrize > 0) {
            batch.set(doc(collection(db, 'transactions')), {
              userId: item.join.userId,
              title: `${payload.tournament.name.slice(0, 42)} Prize (${item.kills} Kills${
                item.isWinner ? ' + Booyah' : ''
              })`.slice(0, 80),
              type: 'credit',
              category: 'prize',
              amount: item.totalPrize,
              status: 'completed',
              referenceId: payload.tournament.id,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      batch.set(doc(db, 'results', payload.tournament.id), {
        tournamentId: payload.tournament.id,
        tournamentName: payload.tournament.name,
        screenshotUrl:
          payload.screenshotDataUrl ||
          MAP_IMAGES[payload.tournament.map] ||
          MAP_IMAGES.Bermuda,
        winnerUserId: winnerEntry.join.userId,
        winnerName: winnerEntry.join.userName,
        winnerBonus: payload.winnerBonus,
        entries: serializedEntries,
        publishedAt: serverTimestamp(),
      });

      batch.update(doc(db, 'tournaments', payload.tournament.id), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(`Prizes distributed & "${payload.tournament.name}" marked completed!`);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Prize distribution failed.', 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  /* ============================================================
     BANNER TABLE + NOTICE + PAYMENT SETTINGS
  ============================================================ */
  async function handleSaveBanner(payload: SaveBannerPayload): Promise<boolean> {
    setBusyId('save-banner');
    try {
      if (payload.id) {
        const existing = banners.find((b) => b.id === payload.id);
        await setDoc(doc(db, 'banners', payload.id), {
          id: payload.id,
          background_image: payload.background_image,
          small_text: payload.small_text,
          big_text: payload.big_text,
          description_text: payload.description_text,
          banner_link: payload.banner_link,
          is_active: payload.is_active,
          createdAt: existing?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Banner updated successfully!');
      } else {
        const newId = `banner_${Date.now()}`;
        await setDoc(doc(db, 'banners', newId), {
          id: newId,
          background_image: payload.background_image,
          small_text: payload.small_text,
          big_text: payload.big_text,
          description_text: payload.description_text,
          banner_link: payload.banner_link,
          is_active: payload.is_active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('Banner added to Banner Table!');
      }
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save banner.', 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleBanner(banner: BannerItem) {
    setBusyId(`banner-${banner.id}`);
    try {
      if (
        typeof banner.background_image === 'string' &&
        typeof banner.small_text === 'string' &&
        typeof banner.big_text === 'string' &&
        typeof banner.description_text === 'string'
      ) {
        await updateDoc(doc(db, 'banners', banner.id), {
          is_active: !banner.is_active,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'banners', banner.id), {
          id: banner.id,
          background_image:
            banner.background_image ||
            banner.banner_image ||
            '/src/assets/images/hero_mega_tournament_1795425010400.jpg',
          small_text: banner.small_text || '',
          big_text: banner.big_text || '',
          description_text: banner.description_text || '',
          banner_link: banner.banner_link || '',
          is_active: !banner.is_active,
          createdAt: banner.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      showToast(`Banner ${!banner.is_active ? 'activated (ON)' : 'turned OFF'}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to toggle banner.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteBanner(bannerId: string) {
    setBusyId(`banner-${bannerId}`);
    try {
      await deleteDoc(doc(db, 'banners', bannerId));
      showToast('Banner deleted.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete banner.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublishBannerNotice(next: BannerNoticeSettings) {
    setBusyId('banner-notice');
    try {
      await setDoc(doc(db, 'settings', 'banner_notice'), {
        ...next,
        updatedAt: serverTimestamp(),
      });
      showToast('Notice bar published live to all players!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Publish failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSavePaymentSettings(next: PaymentSettings) {
    setBusyId('payment-settings');
    try {
      await setDoc(doc(db, 'settings', 'payment'), {
        ...next,
        updatedAt: serverTimestamp(),
      });
      showToast('Payment & QR setup updated for all players!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  function handleCopyAppLink() {
    const url = `${window.location.origin}/index.html`;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(`Copied player app link: ${url}`);
  }

  /* ============================================================
     RENDER GATES (LOADING / LOGIN / RESTRICTED NON-ADMIN)
  ============================================================ */
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-white">
        <div className="text-center">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-[#FF6B00] border-t-transparent" />
          <p className="text-sm font-semibold text-slate-300">Verifying Admin Session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12182B] p-6 shadow-2xl sm:p-8">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/image_febd1a52_14b44ce3.jpg"
              alt="FF Battle Zone Admin"
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-xl border border-[#8B5CFF]/60 bg-[#121518] object-cover"
            />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white">
                FF Battle Zone Admin
              </h1>
              <p className="text-xs font-semibold text-[#FFC107]">
                Restricted Control Center
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-300">
            Authorized tournament administrators only. Sign in with your verified Admin account.
          </p>

          {loginError && (
            <div className="mt-4 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
              {loginError}
            </div>
          )}

          <form onSubmit={(e) => void handleEmailLogin(e)} className="mt-5 space-y-4">
            <div>
              <label htmlFor="admin-email-input" className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">
                Admin Email
              </label>
              <input
                id="admin-email-input"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter admin email"
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-pass-input" className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">
                Password
              </label>
              <input
                id="admin-pass-input"
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="Enter admin password"
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="min-h-[48px] w-full rounded-xl bg-[#FF6B00] px-4 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24] disabled:opacity-50"
            >
              {loginBusy ? 'Signing In...' : 'Sign In with Email'}
            </button>
          </form>

          <button
            type="button"
            disabled={loginBusy}
            onClick={() => void handleGoogleLogin()}
            className="mt-3 min-h-[48px] w-full rounded-xl border border-white/15 bg-white px-4 text-sm font-bold text-[#0A0A0F] transition hover:bg-slate-100 disabled:opacity-50"
          >
            Sign In with Google Admin Account
          </button>

          <div className="mt-5 text-center">
            <a
              href="/index.html"
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              &larr; Back to Player App
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#FF3B30]/40 bg-[#12182B] p-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF3B30]/15 text-[#FF3B30]">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
            Admin Access Only
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Account <span className="font-mono text-white">{currentUser.email || currentUser.uid}</span> does not have administrator privileges.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="min-h-[46px] rounded-xl bg-[#FF6B00] px-4 text-sm font-bold text-white"
            >
              Sign Out &amp; Switch Account
            </button>
            <a
              href="/index.html"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-slate-200"
            >
              Return to Player App
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     AUTHORIZED ADMIN DASHBOARD SHELL
  ============================================================ */
  const pendingWithdrawCount = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingDepositCount = depositRequests.filter((d) => d.status === 'pending').length;

  const primaryNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard Home', icon: LayoutDashboard },
    { id: 'create-tournament', label: 'Create Tournament', icon: PlusCircle },
    { id: 'manage-tournaments', label: 'Manage Tournaments', icon: Trophy },
    { id: 'users', label: 'Manage Users', icon: Users },
    {
      id: 'withdrawals',
      label: 'Withdrawal Requests',
      icon: Wallet,
      badgeCount: pendingWithdrawCount,
    },
    { id: 'results', label: 'Results & Prize', icon: Award },
    { id: 'banner-notice', label: 'Banner & Notice', icon: ImageIcon },
  ];

  const financeNav: NavItem[] = [
    {
      id: 'deposits',
      label: 'QR Deposits',
      icon: QrCode,
      badgeCount: pendingDepositCount,
    },
    { id: 'payment-settings', label: 'Payment & QR Setup', icon: Settings },
  ];

  const activeNavTitle =
    [...primaryNav, ...financeNav].find((n) => n.id === activeScreen)?.label ||
    'Dashboard Home';

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-slate-100">
      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`fixed right-5 bottom-5 z-50 flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-bold shadow-2xl ${
            toast.tone === 'error'
              ? 'border-[#FF3B30] bg-[#1D1014] text-[#FF8A80]'
              : 'border-[#00C853] bg-[#0E1E17] text-[#69F0AE]'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Left Sidebar (Desktop Fixed 264px + Mobile Slide-over) */}
      <aside
        aria-label="FF Battle Zone Admin Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-white/10 bg-[#12182B] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/image_febd1a52_14b44ce3.jpg"
              alt="FF Battle Zone"
              referrerPolicy="no-referrer"
              className="h-10 w-10 shrink-0 rounded-xl border border-[#8B5CFF]/70 bg-[#121518] object-cover"
            />
            <div className="min-w-0">
              <div className="truncate font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-white">
                FF Battle Zone
              </div>
              <div className="text-[11px] font-bold tracking-wider text-[#FF6B00] uppercase">
                Admin Panel
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close Sidebar"
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div>
            <div className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Control Center
            </div>
            <div className="space-y-1">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveScreen(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                      active
                        ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          active ? 'text-white' : 'text-[#FFC107]'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Wallet &amp; QR Setup
            </div>
            <div className="space-y-1">
              {financeNav.map((item) => {
                const Icon = item.icon;
                const active = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveScreen(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                      active
                        ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          active ? 'text-white' : 'text-[#FFC107]'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-white/10 p-3.5">
          <div className="mb-3 rounded-xl bg-[#0A0A0F]/80 px-3 py-2.5">
            <div className="text-[11px] font-semibold text-slate-400">Admin Account</div>
            <div className="truncate text-xs font-bold text-white">
              {currentUser.email || currentUser.uid}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold text-slate-200 transition hover:border-[#FF3B30]/50 hover:bg-[#FF3B30]/15 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0A0A0F]/90 px-4 py-3.5 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open Navigation Menu"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#12182B] text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-[family-name:var(--font-display)] text-base font-bold tracking-wide text-white sm:text-lg">
                {activeNavTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyAppLink}
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-[#12182B] px-3.5 text-xs font-bold text-slate-200 hover:border-[#FFC107]/50"
            >
              <Copy className="h-3.5 w-3.5 text-[#FFC107]" />
              <span className="hidden sm:inline">Copy App Link</span>
            </button>
            <a
              href="/index.html"
              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-[#12182B] px-3.5 text-xs font-bold text-slate-200 hover:border-[#FF6B00]/50"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#FF6B00]" />
              <span>Player App</span>
            </a>
          </div>
        </header>

        {/* Active Screen Viewport */}
        <main className="mx-auto w-full max-w-[1320px] flex-1 p-4 sm:p-6 lg:p-8">
          {activeScreen === 'dashboard' && (
            <DashboardHome
              users={users}
              tournaments={tournaments}
              transactions={transactions}
              withdrawals={withdrawals}
              depositRequests={depositRequests}
              onNavigate={setActiveScreen}
              onGoLive={handleGoLive}
              onApproveWithdrawal={handleApproveWithdrawal}
              onRejectWithdrawal={handleRejectWithdrawal}
              onApproveDeposit={handleApproveDeposit}
              busyId={busyId}
            />
          )}

          {activeScreen === 'create-tournament' && (
            <CreateTournamentScreen
              onPublish={handleCreateTournament}
              isSubmitting={busyId === 'create-tournament'}
            />
          )}

          {activeScreen === 'manage-tournaments' && (
            <ManageTournamentsScreen
              tournaments={tournaments}
              onNavigate={setActiveScreen}
              onFetchTournamentDetails={handleFetchTournamentDetails}
              onSaveEdit={handleSaveTournamentEdit}
              onSaveRoomOnly={handleSaveRoomOnly}
              onDeleteTournament={handleDeleteTournament}
              onCancelAndRefundAll={handleCancelAndRefundAll}
              busyId={busyId}
            />
          )}

          {activeScreen === 'users' && (
            <ManageUsersScreen
              users={users}
              onToggleBan={handleToggleBanUser}
              onCreditDeposit={handleCreditDeposit}
              onCreditBonus={handleCreditBonus}
              onDeductCoins={handleDeductCoins}
              busyId={busyId}
            />
          )}

          {activeScreen === 'withdrawals' && (
            <WithdrawalsScreen
              withdrawals={withdrawals}
              users={users}
              onApprove={handleApproveWithdrawal}
              onReject={handleRejectWithdrawal}
              busyId={busyId}
            />
          )}

          {activeScreen === 'results' && (
            <ResultsPrizeScreen
              tournaments={tournaments}
              onLoadJoins={handleLoadJoinsOnly}
              onDistributePrize={handleDistributePrize}
              isSubmitting={busyId === 'distribute-prize'}
            />
          )}

          {activeScreen === 'banner-notice' && (
            <BannerNoticeScreen
              banners={banners}
              onSaveBanner={handleSaveBanner}
              onToggleBanner={handleToggleBanner}
              onDeleteBanner={handleDeleteBanner}
              settings={bannerNotice}
              onPublish={handlePublishBannerNotice}
              isSaving={busyId === 'banner-notice'}
              busyId={busyId}
            />
          )}

          {activeScreen === 'deposits' && (
            <DepositsScreen
              depositRequests={depositRequests}
              approvedTransactions={transactions.filter((t) => t.category === 'topup')}
              onApproveDeposit={handleApproveDeposit}
              onRejectDeposit={handleRejectDeposit}
              busyId={busyId}
            />
          )}

          {activeScreen === 'payment-settings' && (
            <PaymentSettingsScreen
              settings={paymentSettings}
              onSave={handleSavePaymentSettings}
              isSaving={busyId === 'payment-settings'}
            />
          )}
        </main>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Check, QrCode, RotateCcw, Save, Upload, X, ZoomIn } from 'lucide-react';
import type { DepositRequest, PaymentSettings, WalletTransaction } from '../types';
import { compressImageToDataUrl, formatTimestamp } from '../firebase';

interface DepositsScreenProps {
  depositRequests: DepositRequest[];
  approvedTransactions: WalletTransaction[];
  onApproveDeposit: (d: DepositRequest) => Promise<void>;
  onRejectDeposit: (d: DepositRequest) => Promise<void>;
  busyId: string | null;
}

export const DepositsScreen: React.FC<DepositsScreenProps> = ({
  depositRequests,
  approvedTransactions,
  onApproveDeposit,
  onRejectDeposit,
  busyId,
}) => {
  const [previewImg, setPreviewImg] = useState<{ src: string; title: string } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
          QR Deposit Verification
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Inspect UTR numbers and payment screenshots before crediting player deposit wallets.
        </p>
      </div>

      {/* Pending / Submitted Requests */}
      <div className="space-y-3">
        {depositRequests.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#12182B] p-10 text-center text-sm text-slate-400">
            No QR deposit requests submitted yet.
          </div>
        ) : (
          depositRequests.map((d) => {
            const isBusy = busyId === `dep-${d.id}`;
            return (
              <div
                key={d.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImg({
                        src: d.screenshotData,
                        title: `${d.userName} · ₹${d.amount} · UTR ${d.utrNumber}`,
                      })
                    }
                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#0A0A0F]"
                  >
                    <img
                      src={d.screenshotData}
                      alt={`UTR ${d.utrNumber}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </span>
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-white">{d.userName}</span>
                      <span className="font-mono text-lg font-bold text-[#FFC107]">
                        ₹{Number(d.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase ${
                          d.status === 'approved'
                            ? 'text-[#00C853]'
                            : d.status === 'rejected'
                            ? 'text-[#FF3B30]'
                            : 'text-[#FFC107]'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-300">
                      UTR: {d.utrNumber} · {d.paymentApp} · FF UID: {d.ffUid}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Submitted {formatTimestamp(d.createdAt)}
                      {d.adminNote ? ` · ${d.adminNote}` : ''}
                    </div>
                  </div>
                </div>

                {d.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onApproveDeposit(d)}
                      className="inline-flex min-h-[46px] min-w-[126px] items-center justify-center gap-1.5 rounded-xl bg-[#00C853] px-4 text-sm font-bold text-[#04140A] disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onRejectDeposit(d)}
                      className="inline-flex min-h-[46px] min-w-[126px] items-center justify-center gap-1.5 rounded-xl bg-[#FF3B30] px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Approved Deposit Credits Ledger */}
      <div className="rounded-2xl border border-white/10 bg-[#12182B] p-5">
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-base font-bold text-white">
          Recent Approved Deposit Credits
        </h3>
        {approvedTransactions.length === 0 ? (
          <p className="text-sm text-slate-400">No completed topups recorded yet.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {approvedTransactions.slice(0, 15).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-semibold text-white">{tx.title}</div>
                  <div className="font-mono text-xs text-slate-400">
                    User: {tx.userId} · {formatTimestamp(tx.createdAt)}
                  </div>
                </div>
                <div className="font-mono text-base font-bold text-[#00C853]">
                  +₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshot Lightbox */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewImg(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#12182B] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="truncate text-sm font-bold text-white">{previewImg.title}</div>
              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={previewImg.src}
              alt={previewImg.title}
              referrerPolicy="no-referrer"
              className="max-h-[70vh] w-full rounded-xl bg-[#0A0A0F] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface PaymentSettingsScreenProps {
  settings: PaymentSettings;
  onSave: (next: PaymentSettings) => Promise<void>;
  isSaving: boolean;
}

export const PaymentSettingsScreen: React.FC<PaymentSettingsScreenProps> = ({
  settings,
  onSave,
  isSaving,
}) => {
  const [form, setForm] = useState<PaymentSettings>(settings);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      const dataUrl = await compressImageToDataUrl(file, 720, 228000);
      setForm((prev) => ({ ...prev, depositQrImage: dataUrl }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to compress QR image.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (form.depositUpiId.trim().length < 5 || !form.depositUpiId.includes('@')) {
      setErrorMsg('Enter a valid Deposit UPI ID containing "@".');
      return;
    }
    await onSave({
      ...form,
      depositUpiId: form.depositUpiId.trim(),
      depositPayeeName: form.depositPayeeName.trim(),
      withdrawMethods: 'PhonePe',
      minDeposit: Math.max(1, Number(form.minDeposit) || 10),
      maxDeposit: Math.max(10, Number(form.maxDeposit) || 10000),
      minWithdraw: Math.max(10, Number(form.minWithdraw) || 20),
      maxWithdraw: Math.max(10, Number(form.maxWithdraw) || 5000),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
          Payment &amp; QR Setup
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Configure official UPI ID, deposit QR code image, and wallet min/max limits.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <QrCode className="h-5 w-5 text-[#FF6B00]" />
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
              Deposit QR &amp; UPI Details
            </h3>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase">
              <Upload className="h-3.5 w-3.5 text-[#FF6B00]" />
              Upload Deposit QR Code Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleQrUpload(e)}
              className="block w-full cursor-pointer rounded-xl border border-white/15 bg-[#0A0A0F] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF6B00] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
          </div>

          {form.depositQrImage && (
            <div className="flex items-center gap-4 rounded-xl border border-white/15 bg-white p-3 text-[#0A0A0F]">
              <img
                src={form.depositQrImage}
                alt="Deposit QR Preview"
                referrerPolicy="no-referrer"
                className="h-24 w-24 rounded-lg border border-slate-200 object-contain"
              />
              <div className="text-xs">
                <div className="font-bold">Active Deposit QR</div>
                <div className="mt-0.5 text-slate-600">{form.depositPayeeName}</div>
                <div className="font-mono font-bold text-[#FF6B00]">{form.depositUpiId}</div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Official UPI ID</label>
            <input
              type="text"
              value={form.depositUpiId}
              onChange={(e) => setForm((p) => ({ ...p, depositUpiId: e.target.value }))}
              className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Payee / Merchant Name</label>
            <input
              type="text"
              value={form.depositPayeeName}
              onChange={(e) => setForm((p) => ({ ...p, depositPayeeName: e.target.value }))}
              className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-bold text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Min Deposit (₹)</label>
              <input
                type="number"
                min={1}
                value={form.minDeposit}
                onChange={(e) => setForm((p) => ({ ...p, minDeposit: Number(e.target.value) }))}
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Max Deposit (₹)</label>
              <input
                type="number"
                min={10}
                value={form.maxDeposit}
                onChange={(e) => setForm((p) => ({ ...p, maxDeposit: Number(e.target.value) }))}
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6">
          <div className="space-y-4">
            <h3 className="border-b border-white/10 pb-3 font-[family-name:var(--font-display)] text-base font-bold text-white">
              Withdrawal Limits &amp; Rules
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Min Withdraw (₹)</label>
                <input
                  type="number"
                  min={10}
                  value={form.minWithdraw}
                  onChange={(e) => setForm((p) => ({ ...p, minWithdraw: Number(e.target.value) }))}
                  className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Max Withdraw (₹)</label>
                <input
                  type="number"
                  min={10}
                  value={form.maxWithdraw}
                  onChange={(e) => setForm((p) => ({ ...p, maxWithdraw: Number(e.target.value) }))}
                  className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Supported Method</label>
              <input
                type="text"
                value="PhonePe"
                readOnly
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Payout Timing</label>
              <input
                type="text"
                value={form.withdrawTime}
                onChange={(e) => setForm((p) => ({ ...p, withdrawTime: e.target.value }))}
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Withdrawal Note</label>
              <input
                type="text"
                value={form.withdrawNote || ''}
                onChange={(e) => setForm((p) => ({ ...p, withdrawNote: e.target.value }))}
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/20 hover:bg-[#ff7f24] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Payment & QR'}
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({
                  depositUpiId: 'ffbattlezone@okaxis',
                  depositPayeeName: 'FF BATTLE ZONE ARENA',
                  depositQrImage: '',
                  depositNote: 'Pay via PhonePe only (QR / UPI), then submit your 12-digit UTR & payment screenshot for Admin approval.',
                  minDeposit: 10,
                  maxDeposit: 10000,
                  minWithdraw: 20,
                  maxWithdraw: 5000,
                  withdrawMethods: 'PhonePe',
                  withdrawTime: '15-30 Mins (0% Fee)',
                  withdrawNote: 'Only Winning Coins can be withdrawn. Deposited coins are for tournament entry only.',
                })
              }
              className="inline-flex min-h-[50px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

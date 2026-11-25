import React, { useEffect, useState } from 'react';
import {
  Edit3,
  ExternalLink,
  ImagePlus,
  Link2,
  Megaphone,
  Plus,
  Power,
  Send,
  Trash2,
} from 'lucide-react';
import type { BannerItem, BannerNoticeSettings } from '../types';
import { compressImageToDataUrl } from '../firebase';

export interface SaveBannerPayload {
  id?: string;
  banner_image: string;
  banner_link: string;
  is_active: boolean;
}

interface BannerNoticeScreenProps {
  banners: BannerItem[];
  onSaveBanner: (payload: SaveBannerPayload) => Promise<boolean>;
  onToggleBanner: (banner: BannerItem) => Promise<void>;
  onDeleteBanner: (bannerId: string) => Promise<void>;
  settings: BannerNoticeSettings;
  onPublish: (next: BannerNoticeSettings) => Promise<void>;
  isSaving: boolean;
  busyId: string | null;
}

export const BannerNoticeScreen: React.FC<BannerNoticeScreenProps> = ({
  banners,
  onSaveBanner,
  onToggleBanner,
  onDeleteBanner,
  settings,
  onPublish,
  isSaving,
  busyId,
}) => {
  // Banner Table Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [bannerError, setBannerError] = useState('');

  // Notice Bar State
  const [noticeText, setNoticeText] = useState(settings.noticeText);
  const [noticeEnabled, setNoticeEnabled] = useState(settings.noticeEnabled);
  const [noticeError, setNoticeError] = useState('');

  useEffect(() => {
    setNoticeText(settings.noticeText);
    setNoticeEnabled(settings.noticeEnabled);
  }, [settings]);

  function resetBannerForm() {
    setEditingId(null);
    setBannerImage('');
    setBannerLink('');
    setIsActive(true);
    setBannerError('');
  }

  function startEditBanner(b: BannerItem) {
    setEditingId(b.id);
    setBannerImage(b.banner_image);
    setBannerLink(b.banner_link || '');
    setIsActive(Boolean(b.is_active));
    setBannerError('');
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, 1080, 228000);
      setBannerImage(dataUrl);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to compress banner image.');
    }
  }

  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBannerError('');

    const cleanImage = bannerImage.trim();
    const cleanLink = bannerLink.trim();

    if (!cleanImage) {
      setBannerError('Please upload a Banner Image or paste an Image URL.');
      return;
    }
    if (cleanImage.length > 250000) {
      setBannerError('Banner image is too large. Please upload a smaller image or use an HTTPS URL.');
      return;
    }
    if (cleanLink && !/^(https?:\/\/|\/|#)/i.test(cleanLink)) {
      setBannerError('Banner Link must start with https://, http://, /, or leave empty.');
      return;
    }
    if (cleanLink.length > 500) {
      setBannerError('Banner Link must be 500 characters or fewer.');
      return;
    }

    const ok = await onSaveBanner({
      id: editingId || undefined,
      banner_image: cleanImage,
      banner_link: cleanLink,
      is_active: isActive,
    });
    if (ok) {
      resetBannerForm();
    }
  }

  async function handleNoticeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNoticeError('');

    const cleanNotice = noticeText.trim();
    if (cleanNotice.length < 2 || cleanNotice.length > 220) {
      setNoticeError('Notice text must be between 2 and 220 characters.');
      return;
    }

    await onPublish({
      ...settings,
      noticeText: cleanNotice,
      noticeEnabled,
    });
  }

  const savingBanner = busyId === 'save-banner';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
          Banner &amp; Notice
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Manage clickable image-only Home Banners (no overlay buttons) and the announcement notice bar.
        </p>
      </div>

      {/* 1. ADD / EDIT BANNER FORM */}
      <form
        onSubmit={(e) => void handleBannerSubmit(e)}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-[#8B5CFF]" />
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
              {editingId ? `Edit Banner (${editingId})` : 'Add New Banner'}
            </h3>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-200">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[#00C853]"
            />
            is_active ({isActive ? 'ON — Visible to Users' : 'OFF — Hidden'})
          </label>
        </div>

        {bannerError && (
          <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
            {bannerError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="bn-banner-file"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
            >
              Upload Banner Image (16:9 Recommended)
            </label>
            <input
              id="bn-banner-file"
              type="file"
              accept="image/*"
              onChange={(e) => void handleBannerUpload(e)}
              className="block w-full cursor-pointer rounded-xl border border-white/15 bg-[#0A0A0F] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B5CFF] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="bn-banner-image-url"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
            >
              Or Banner Image URL (banner_image)
            </label>
            <input
              id="bn-banner-image-url"
              type="text"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-medium text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bn-banner-link"
            className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase"
          >
            <Link2 className="h-3.5 w-3.5 text-[#8B5CFF]" />
            Banner Link URL (Optional — Empty = Click does nothing)
          </label>
          <input
            id="bn-banner-link"
            type="text"
            maxLength={500}
            value={bannerLink}
            onChange={(e) => setBannerLink(e.target.value)}
            placeholder="https://t.me/yourchannel or leave empty"
            className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-medium text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
          />
        </div>

        {/* Clean Image-Only Preview */}
        {bannerImage.trim() && (
          <div>
            <div className="mb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Home Preview (Pure Image, Zero Buttons)
            </div>
            <div className="w-full max-w-md aspect-[16/7] overflow-hidden rounded-2xl border border-white/15 bg-white px-4">
              <img
                src={bannerImage.trim()}
                alt="Banner Preview"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain object-center"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={savingBanner}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#8B5CFF] px-6 font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-white shadow-lg shadow-[#8B5CFF]/25 transition hover:bg-[#7C3AED] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {savingBanner
              ? 'Saving Banner...'
              : editingId
                ? 'Update Banner'
                : 'Save Banner'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetBannerForm}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-xs font-bold text-slate-300 hover:bg-white/10"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* 2. BANNER TABLE (id, banner_image, banner_link, is_active) */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12182B]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
            Banner Table ({banners.length})
          </h3>
          <span className="text-xs text-slate-400">
            Active banners: {banners.filter((b) => b.is_active).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#0A0A0F]/70 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">banner_image</th>
                <th className="px-4 py-3">banner_link</th>
                <th className="px-4 py-3">is_active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No banners uploaded yet. Add a banner above to show it on the Home Page.
                  </td>
                </tr>
              ) : (
                banners.map((b) => {
                  const rowBusy = busyId === `banner-${b.id}`;
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-300">
                        {b.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.banner_image}
                            alt={b.id}
                            referrerPolicy="no-referrer"
                            className="h-12 w-24 shrink-0 rounded-lg border border-white/15 object-cover"
                          />
                          <span className="max-w-[160px] truncate font-mono text-[11px] text-slate-400">
                            {b.banner_image.startsWith('data:') ? 'Uploaded Image' : b.banner_image}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {b.banner_link ? (
                          <a
                            href={b.banner_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[200px] items-center gap-1 truncate font-medium text-[#A78BFA] hover:underline"
                          >
                            <span className="truncate">{b.banner_link}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Empty (No Link)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => void onToggleBanner(b)}
                          className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                            b.is_active
                              ? 'bg-[#00C853]/15 text-[#00E676] border border-[#00C853]/40'
                              : 'bg-white/5 text-slate-400 border border-white/15'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {b.is_active ? 'true (ON)' : 'false (OFF)'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => startEditBanner(b)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/20"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => void onDeleteBanner(b.id)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-[#FF3B30]/15 px-3 text-xs font-bold text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. HOME TICKER NOTICE SECTION */}
      <form
        onSubmit={(e) => void handleNoticeSubmit(e)}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[#FFC107]" />
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
              Home Ticker Notice
            </h3>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-300">
            <input
              type="checkbox"
              checked={noticeEnabled}
              onChange={(e) => setNoticeEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#00C853]"
            />
            Show Notice Bar to Players
          </label>
        </div>

        {noticeError && (
          <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
            {noticeError}
          </div>
        )}

        <div>
          <label
            htmlFor="bn-notice-text"
            className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
          >
            Notice Message
          </label>
          <textarea
            id="bn-notice-text"
            rows={2}
            maxLength={220}
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="e.g. WELCOME TO FF BATTLE ZONE · INSTANT WITHDRAWAL LIVE 24/7"
            className="w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
          />
          <div className="mt-1 text-right font-mono text-[11px] text-slate-400">
            {noticeText.length}/220
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-3 font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-white shadow-lg shadow-[#FF6B00]/20 transition hover:bg-[#ff7f24] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {isSaving ? 'Publishing Notice...' : 'Publish Notice Bar'}
        </button>
      </form>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Check,
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

const READY_BACKGROUNDS = [
  {
    label: 'Mega Arena',
    url: '/src/assets/images/hero_mega_tournament_1795425010400.jpg',
  },
  {
    label: 'Clash Squad',
    url: '/src/assets/images/hero_clash_squad_1795425009518.jpg',
  },
  {
    label: 'Solo Rush',
    url: '/src/assets/images/hero_solo_rush_1795425010236.jpg',
  },
  {
    label: 'Bermuda',
    url: '/src/assets/images/map_bermuda_island_1795425009794.jpg',
  },
  {
    label: 'Purgatory',
    url: '/src/assets/images/map_purgatory_valley_1795425010252.jpg',
  },
];

export interface SaveBannerPayload {
  id?: string;
  background_image: string;
  small_text: string;
  big_text: string;
  description_text: string;
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
  // Banner Builder State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState(READY_BACKGROUNDS[0].url);
  const [smallText, setSmallText] = useState('FEATURED CHAMPIONSHIP');
  const [bigText, setBigText] = useState('WIN BIG DAILY');
  const [descriptionText, setDescriptionText] = useState(
    'Join daily Solo, Duo & Squad custom rooms with instant prizes.'
  );
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
    setBackgroundImage(READY_BACKGROUNDS[0].url);
    setSmallText('FEATURED CHAMPIONSHIP');
    setBigText('WIN BIG DAILY');
    setDescriptionText('Join daily Solo, Duo & Squad custom rooms with instant prizes.');
    setBannerLink('');
    setIsActive(true);
    setBannerError('');
  }

  function startEditBanner(b: BannerItem) {
    setEditingId(b.id);
    setBackgroundImage(b.background_image || b.banner_image || READY_BACKGROUNDS[0].url);
    setSmallText(b.small_text || '');
    setBigText(b.big_text || '');
    setDescriptionText(b.description_text || '');
    setBannerLink(b.banner_link || '');
    setIsActive(Boolean(b.is_active));
    setBannerError('');
  }

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerError('');
    try {
      const dataUrl = await compressImageToDataUrl(file, 1080, 228000);
      setBackgroundImage(dataUrl);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to compress background image.');
    }
  }

  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBannerError('');

    const cleanBg = backgroundImage.trim();
    const cleanSmall = smallText.trim().slice(0, 80);
    const cleanBig = bigText.trim().slice(0, 100);
    const cleanDesc = descriptionText.trim().slice(0, 220);
    const cleanLink = bannerLink.trim();

    if (!cleanBg) {
      setBannerError('Please select a ready background image, upload one, or enter an image URL.');
      return;
    }
    if (cleanBg.length > 250000) {
      setBannerError('Background image is too large. Choose a smaller image or HTTPS URL.');
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
      background_image: cleanBg,
      small_text: cleanSmall,
      big_text: cleanBig,
      description_text: cleanDesc,
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
          Choose or upload a background image and enter HTML banner text (never baked into the image so it wraps cleanly on mobile).
        </p>
      </div>

      {/* 1. BANNER EDITOR + LIVE PREVIEW */}
      <form
        onSubmit={(e) => void handleBannerSubmit(e)}
        className="space-y-5 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-[#8B5CFF]" />
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
              {editingId ? `Edit Banner (${editingId})` : 'Create Home Banner'}
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

        {/* 1. Background Select Option (5 Ready Backgrounds) */}
        <div>
          <div className="mb-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
            1. Select Ready Background Image
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {READY_BACKGROUNDS.map((bg) => {
              const selected = backgroundImage === bg.url;
              return (
                <button
                  key={bg.url}
                  type="button"
                  onClick={() => setBackgroundImage(bg.url)}
                  className={`group relative overflow-hidden rounded-xl border text-left transition ${
                    selected
                      ? 'border-[#8B5CFF] ring-2 ring-[#8B5CFF]'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  <img
                    src={bg.url}
                    alt={bg.label}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full object-cover"
                  />
                  <div className="flex items-center justify-between bg-[#0A0A0F]/90 px-2 py-1.5 text-[11px] font-bold text-white">
                    <span className="truncate">{bg.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 shrink-0 text-[#8B5CFF]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Custom Background OR Paste Image URL */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="bn-banner-file"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
            >
              Or Upload Your Own Background Image
            </label>
            <input
              id="bn-banner-file"
              type="file"
              accept="image/*"
              onChange={(e) => void handleBackgroundUpload(e)}
              className="block w-full cursor-pointer rounded-xl border border-white/15 bg-[#0A0A0F] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B5CFF] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="bn-banner-image-url"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
            >
              Or Background Image URL (background_image)
            </label>
            <input
              id="bn-banner-image-url"
              type="text"
              value={backgroundImage}
              onChange={(e) => setBackgroundImage(e.target.value)}
              placeholder="https://example.com/bg.jpg"
              className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-medium text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
            />
          </div>
        </div>

        {/* 2. 3 Text Input Boxes */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="bn-small-text"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
            >
              Small Text (Purple Pill Badge)
            </label>
            <input
              id="bn-small-text"
              type="text"
              maxLength={80}
              value={smallText}
              onChange={(e) => setSmallText(e.target.value)}
              placeholder="e.g. FEATURED CHAMPIONSHIP"
              className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="bn-big-text"
              className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
            >
              Big Text (Bold Headline)
            </label>
            <input
              id="bn-big-text"
              type="text"
              maxLength={100}
              value={bigText}
              onChange={(e) => setBigText(e.target.value)}
              placeholder="e.g. WIN BIG DAILY"
              className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bn-description-text"
            className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase"
          >
            Description Text
          </label>
          <textarea
            id="bn-description-text"
            rows={2}
            maxLength={220}
            value={descriptionText}
            onChange={(e) => setDescriptionText(e.target.value)}
            placeholder="e.g. Join daily Solo, Duo & Squad custom rooms with instant prizes."
            className="w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:border-[#8B5CFF] focus:outline-none"
          />
        </div>

        {/* 3. Banner Link Input */}
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

        {/* 4. Live Preview (Updates immediately as Admin types or picks background) */}
        <div>
          <div className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Live Preview (HTML Text Over Background)
          </div>
          <div className="relative w-full overflow-hidden rounded-[16px] border border-white/15 bg-[#0A0A0F] min-h-[150px] flex items-center">
            {backgroundImage.trim() && (
              <img
                src={backgroundImage.trim()}
                alt="Banner Background Preview"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(10, 12, 24, 0.84) 0%, rgba(10, 12, 24, 0.58) 55%, rgba(10, 12, 24, 0.35) 100%)',
              }}
            />
            <div className="relative z-10 flex w-full flex-col items-start gap-2 p-4">
              {smallText.trim() && (
                <span className="inline-block rounded-full bg-[#8B5CFF] px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                  {smallText.trim()}
                </span>
              )}
              {bigText.trim() && (
                <div className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight text-white break-words sm:text-2xl">
                  {bigText.trim()}
                </div>
              )}
              {descriptionText.trim() && (
                <p className="max-w-xl text-xs leading-relaxed text-white/90 break-words sm:text-sm">
                  {descriptionText.trim()}
                </p>
              )}
            </div>
          </div>
        </div>

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

      {/* 2. BANNER TABLE */}
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
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#0A0A0F]/70 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">background_image</th>
                <th className="px-4 py-3">small_text / big_text / description_text</th>
                <th className="px-4 py-3">banner_link</th>
                <th className="px-4 py-3">is_active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No banners added yet. Create one above to show it on the Home Page.
                  </td>
                </tr>
              ) : (
                banners.map((b) => {
                  const rowBusy = busyId === `banner-${b.id}`;
                  const bgSrc = b.background_image || b.banner_image || '';
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <img
                          src={bgSrc}
                          alt={b.big_text || b.id}
                          referrerPolicy="no-referrer"
                          className="h-14 w-24 shrink-0 rounded-lg border border-white/15 object-cover"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        {b.small_text && (
                          <span className="mb-1 inline-block rounded-full bg-[#8B5CFF] px-2 py-0.5 text-[10px] font-bold text-white">
                            {b.small_text}
                          </span>
                        )}
                        <div className="font-bold text-white truncate">
                          {b.big_text || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2">
                          {b.description_text || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {b.banner_link ? (
                          <a
                            href={b.banner_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[180px] items-center gap-1 truncate font-medium text-[#A78BFA] hover:underline"
                          >
                            <span className="truncate">{b.banner_link}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-500">Empty</span>
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

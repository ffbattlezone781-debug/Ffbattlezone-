import React, { useEffect, useState } from 'react';
import { ImagePlus, Megaphone, Send, Trash2 } from 'lucide-react';
import type { BannerNoticeSettings } from '../types';
import { compressImageToDataUrl } from '../firebase';

interface BannerNoticeScreenProps {
  settings: BannerNoticeSettings;
  onPublish: (next: BannerNoticeSettings) => Promise<void>;
  isSaving: boolean;
}

export const BannerNoticeScreen: React.FC<BannerNoticeScreenProps> = ({
  settings,
  onPublish,
  isSaving,
}) => {
  const [noticeText, setNoticeText] = useState(settings.noticeText);
  const [noticeEnabled, setNoticeEnabled] = useState(settings.noticeEnabled);
  const [bannerTitle, setBannerTitle] = useState(settings.bannerTitle || '');
  const [bannerSubtitle, setBannerSubtitle] = useState(settings.bannerSubtitle || '');
  const [bannerImage, setBannerImage] = useState(settings.bannerImage || '');
  const [bannerEnabled, setBannerEnabled] = useState(settings.bannerEnabled);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setNoticeText(settings.noticeText);
    setNoticeEnabled(settings.noticeEnabled);
    setBannerTitle(settings.bannerTitle || '');
    setBannerSubtitle(settings.bannerSubtitle || '');
    setBannerImage(settings.bannerImage || '');
    setBannerEnabled(settings.bannerEnabled);
  }, [settings]);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      const dataUrl = await compressImageToDataUrl(file, 1080, 228000);
      setBannerImage(dataUrl);
      setBannerEnabled(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to compress banner image.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const cleanNotice = noticeText.trim();
    if (cleanNotice.length < 2 || cleanNotice.length > 220) {
      setErrorMsg('Notice text must be between 2 and 220 characters.');
      return;
    }

    await onPublish({
      noticeText: cleanNotice,
      noticeEnabled,
      bannerTitle: bannerTitle.trim().slice(0, 80),
      bannerSubtitle: bannerSubtitle.trim().slice(0, 180),
      bannerImage: bannerImage.trim(),
      bannerEnabled,
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
          Banner &amp; Notice
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Upload a promotional home banner and broadcast an announcement ticker directly to all players.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-6 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-7"
      >
        {errorMsg && (
          <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
            {errorMsg}
          </div>
        )}

        {/* Notice Text Section */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0A0A0F]/65 p-5">
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

          <div>
            <label htmlFor="bn-notice-text" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Notice Message
            </label>
            <textarea
              id="bn-notice-text"
              rows={2}
              maxLength={220}
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              placeholder="e.g. WELCOME TO FF BATTLE ZONE · INSTANT WITHDRAWAL LIVE 24/7"
              className="w-full rounded-xl border border-white/15 bg-[#12182B] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
            />
            <div className="mt-1 text-right font-mono text-[11px] text-slate-400">
              {noticeText.length}/220
            </div>
          </div>
        </div>

        {/* Banner Image & Copy Section */}
        <div className="space-y-4 rounded-xl border border-white/10 bg-[#0A0A0F]/65 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-[#FF6B00]" />
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                Featured Home Banner Image
              </h3>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={bannerEnabled}
                onChange={(e) => setBannerEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#00C853]"
              />
              Enable Custom Banner
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="bn-banner-title" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
                Banner Headline (Optional)
              </label>
              <input
                id="bn-banner-title"
                type="text"
                maxLength={80}
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="e.g. WIN BIG DAILY"
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#12182B] px-4 text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="bn-banner-subtitle" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
                Banner Subtitle (Optional)
              </label>
              <input
                id="bn-banner-subtitle"
                type="text"
                maxLength={180}
                value={bannerSubtitle}
                onChange={(e) => setBannerSubtitle(e.target.value)}
                placeholder="e.g. Join daily Solo, Duo & Squad Free Fire battles."
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#12182B] px-4 text-sm font-semibold text-white focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bn-banner-file" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Upload Banner Image (16:9 Recommended)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="bn-banner-file"
                type="file"
                accept="image/*"
                onChange={(e) => void handleBannerUpload(e)}
                className="block flex-1 cursor-pointer rounded-xl border border-white/15 bg-[#12182B] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF6B00] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
              {bannerImage && (
                <button
                  type="button"
                  onClick={() => setBannerImage('')}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#FF3B30]/15 px-4 text-xs font-bold text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Image
                </button>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#12182B] aspect-video max-h-64 w-full">
            <img
              src={bannerImage || '/src/assets/images/hero_banner_esports_1795424989977.jpg'}
              alt="Live Banner Preview"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/90 via-[#0A0A0F]/55 to-transparent p-5 flex flex-col justify-end">
              {bannerTitle && (
                <div className="font-[family-name:var(--font-display)] text-lg font-bold text-white sm:text-xl">
                  {bannerTitle}
                </div>
              )}
              {bannerSubtitle && (
                <div className="mt-1 max-w-md text-xs font-medium text-slate-200 sm:text-sm">
                  {bannerSubtitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Big Orange Publish Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF6B00] px-6 py-3 font-[family-name:var(--font-display)] text-base font-bold tracking-wide text-white shadow-xl shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24] disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          {isSaving ? 'Publishing Updates...' : 'Publish Banner & Notice'}
        </button>
      </form>
    </div>
  );
};

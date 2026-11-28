import React from 'react';

export const AdminShellSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#0A0A0F] text-slate-100" aria-busy="true" aria-label="Loading Admin Panel">
      {/* Desktop Sidebar Skeleton */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0D111F] p-5 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="admin-skel h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="admin-skel h-4 w-32" />
              <div className="admin-skel h-3 w-20" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#12182B]/60 px-3 py-2.5"
              >
                <div className="admin-skel h-4 w-4 shrink-0 rounded" />
                <div className="admin-skel h-3.5 flex-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#12182B]/70 p-3.5">
          <div className="admin-skel h-3 w-20" />
          <div className="admin-skel mt-2 h-4 w-32" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] items-center justify-between border-b border-white/10 bg-[#0D111F]/90 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="admin-skel h-9 w-9 rounded-xl lg:hidden" />
            <div className="space-y-1.5">
              <div className="admin-skel h-5 w-44" />
              <div className="admin-skel h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="admin-skel hidden h-9 w-28 rounded-xl sm:block" />
            <div className="admin-skel h-9 w-24 rounded-xl" />
            <div className="admin-skel h-9 w-20 rounded-xl" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1320px] flex-1 p-4 sm:p-6 lg:p-8">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Hero Banner Skeleton */}
      <div className="rounded-2xl border border-white/10 bg-[#12182B] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="admin-skel h-6 w-64" />
            <div className="admin-skel h-4 w-80 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="admin-skel h-10 w-36 rounded-xl" />
            <div className="admin-skel h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-white/10 bg-[#12182B] p-5">
            <div className="flex items-center justify-between">
              <div className="admin-skel h-3.5 w-28" />
              <div className="admin-skel h-8 w-8 rounded-lg" />
            </div>
            <div className="admin-skel mt-3.5 h-8 w-24" />
            <div className="admin-skel mt-2.5 h-3 w-36" />
          </div>
        ))}
      </div>

      {/* 2 Split Queue Sections */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="rounded-2xl border border-white/10 bg-[#12182B] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="admin-skel h-5 w-44" />
              <div className="admin-skel h-4 w-24" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, row) => (
                <div key={row} className="rounded-xl border border-white/10 bg-[#0A0A0F]/65 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="admin-skel h-4 w-48" />
                      <div className="admin-skel h-3 w-36" />
                      <div className="admin-skel h-3 w-28" />
                    </div>
                    <div className="admin-skel h-7 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ListRowsSkeleton: React.FC<{
  rows?: number;
  withFilterBar?: boolean;
  withHeader?: boolean;
}> = ({ rows = 4, withFilterBar = true, withHeader = true }) => {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading records">
      {withHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="admin-skel h-7 w-52" />
            <div className="admin-skel h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <div className="admin-skel h-9 w-28 rounded-xl" />
            <div className="admin-skel h-9 w-24 rounded-xl" />
          </div>
        </div>
      )}

      {withFilterBar && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#12182B] p-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="admin-skel h-10 w-24 rounded-xl" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#12182B] p-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="admin-skel h-3 w-16" />
                <div className="admin-skel h-5 w-36" />
              </div>
              <div className="space-y-2">
                <div className="admin-skel h-3 w-16" />
                <div className="admin-skel h-5 w-28" />
              </div>
              <div className="space-y-2">
                <div className="admin-skel h-3 w-20" />
                <div className="admin-skel h-5 w-32" />
              </div>
              <div className="space-y-2">
                <div className="admin-skel h-3 w-16" />
                <div className="admin-skel h-6 w-20" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0A0A0F]/60 px-3.5 py-2.5">
              <div className="admin-skel h-4 w-48" />
              <div className="admin-skel h-8 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RosterTableSkeleton: React.FC<{
  rows?: number;
  variant?: 'table' | 'prize';
}> = ({ rows = 5, variant = 'table' }) => {
  if (variant === 'prize') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading joined players">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#0A0A0F]/70 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="admin-skel h-4 w-4 rounded-full" />
              <div className="admin-skel h-6 w-10 rounded" />
              <div className="space-y-1.5">
                <div className="admin-skel h-4 w-36" />
                <div className="admin-skel h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="admin-skel h-9 w-20 rounded-lg" />
              <div className="admin-skel h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0F]/60" aria-busy="true" aria-label="Loading roster">
      <div className="grid grid-cols-4 gap-3 border-b border-white/10 px-3 py-2.5">
        <div className="admin-skel h-3 w-10" />
        <div className="admin-skel h-3 w-20" />
        <div className="admin-skel h-3 w-16" />
        <div className="admin-skel ml-auto h-3 w-14" />
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="grid grid-cols-4 items-center gap-3 px-3 py-3">
            <div className="admin-skel h-4 w-8" />
            <div className="admin-skel h-4 w-28" />
            <div className="admin-skel h-4 w-24" />
            <div className="admin-skel ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};

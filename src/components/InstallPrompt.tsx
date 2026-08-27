"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Download } from "lucide-react";

/** 延迟安装提示：浏览 ≥3 个页面后轻提示一次，7 天内不再打扰 */
const KEY_PAGES = "apr:visited-count";
const KEY_DISMISS = "apr:install-dismissed-at";
const DAY = 864e5;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    try {
      const dismissed = Number(localStorage.getItem(KEY_DISMISS) || 0);
      if (dismissed && Date.now() - dismissed < 7 * DAY) return;
      const count = Number(sessionStorage.getItem(KEY_PAGES) || localStorage.getItem(KEY_PAGES) || 0) + 1;
      sessionStorage.setItem(KEY_PAGES, String(count));
      localStorage.setItem(KEY_PAGES, String(count));
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (standalone) return;
      if (count >= 3) setShow(true);
    } catch {}

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY_DISMISS, String(Date.now()));
    } catch {}
    setShow(false);
  }

  async function install() {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice?.catch?.(() => {});
      setDeferred(null);
    }
    dismiss();
  }

  if (!show) return null;
  return (
    <div className="fixed bottom-[70px] md:bottom-5 inset-x-4 md:left-auto md:right-6 z-50 md:w-80">
      <div className="card shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">安装 AI Plan Radar</p>
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">添加到主屏幕，随时查看行情与选型建议。</p>
          <div className="mt-2.5 flex gap-2">
            <button onClick={install} className="btn btn-primary px-3 py-1.5 text-xs">
              <Download size={13} /> 安装
            </button>
            <button onClick={dismiss} className="btn btn-secondary px-3 py-1.5 text-xs">
              暂不
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="关闭" className="p-1 text-gray-400 hover:text-gray-600 -m-1">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/** 离线状态条 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const f = () => setOffline(!navigator.onLine);
    f();
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => {
      window.removeEventListener("online", f);
      window.removeEventListener("offline", f);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="bg-orange-50 border-b border-orange-200 text-orange-800 text-xs md:text-sm px-4 py-2 flex items-center gap-2 justify-center">
      当前处于离线状态，以下为最近一次缓存数据。
      <Link href="/offline" className="underline font-medium shrink-0">
        了解详情
      </Link>
    </div>
  );
}

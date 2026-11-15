import type { Profile } from './profile';

/** Milliseconds from `now` until the next HH:MM occurrence (today if still ahead, else tomorrow). */
export function msUntilNext(time: string, now: Date) {
  const [h, m] = time.split(':').map(Number);
  const next = new Date(now); next.setHours(h ?? 20, m ?? 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
export async function requestReminderPermission() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  try { await Notification.requestPermission(); } catch {}
}
function remindersEnabled() { try { return localStorage.getItem('orbit-reminders') !== 'false'; } catch { return true; } }
async function notify(body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => undefined);
  if (reg) await reg.showNotification('ORBIT', { body, tag: 'orbit-checkin', icon: '/favicon.ico' });
  else new Notification('ORBIT', { body, tag: 'orbit-checkin' });
}
/** Schedules the daily reminder while the app is open; returns a cleanup. Skips if today's check-in is done. */
export function scheduleDailyReminder(profile: Profile, hasCheckedInToday: () => boolean) {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const key = `orbit-reminded-${new Date().toDateString()}`;
      if (remindersEnabled() && !hasCheckedInToday() && !localStorage.getItem(key)) { localStorage.setItem(key, '1'); await notify('Time for your daily check-in. A few minutes, just for you.'); }
      arm();
    }, msUntilNext(profile.checkInTime, new Date()));
  };
  arm();
  const onVisible = () => { if (document.visibilityState === 'visible') arm(); };
  document.addEventListener('visibilitychange', onVisible);
  return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
}

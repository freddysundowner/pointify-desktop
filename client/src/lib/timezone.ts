// Force every date/time the app displays to be shown in Kenyan time
// (East Africa Time, UTC+3) regardless of the viewer's device timezone or the
// server timezone. Timestamps from the backend are stored in UTC; without this
// the app would render them in whatever timezone the browser/host happens to be
// in, so a sale rung up at 5:52 PM in Nairobi could show as 2:52 PM.
//
// We do this once, centrally, by defaulting the `timeZone` option of the
// standard Date formatting methods to Africa/Nairobi when the caller did not
// already specify one. This means all existing and future `toLocaleString` /
// `toLocaleDateString` / `toLocaleTimeString` calls automatically use Kenyan
// time without having to touch every call site. Explicit `timeZone` options are
// always respected.

export const APP_TIME_ZONE = 'Africa/Nairobi';

type DateFormatMethod = 'toLocaleString' | 'toLocaleDateString' | 'toLocaleTimeString';

function withDefaultTimeZone(
  args: any[],
): [Intl.LocalesArgument, Intl.DateTimeFormatOptions] {
  const [locales, options] = args as [
    Intl.LocalesArgument,
    Intl.DateTimeFormatOptions | undefined,
  ];
  const merged: Intl.DateTimeFormatOptions = { ...(options || {}) };
  if (!merged.timeZone) {
    merged.timeZone = APP_TIME_ZONE;
  }
  return [locales, merged];
}

function patchMethod(method: DateFormatMethod) {
  const original = Date.prototype[method] as (
    this: Date,
    ...args: any[]
  ) => string;
  // Guard against double-patching (e.g. HMR re-running this module).
  if ((original as any).__keTimeZonePatched) return;

  const patched = function (this: Date, ...args: any[]): string {
    const [locales, options] = withDefaultTimeZone(args);
    return original.call(this, locales as any, options);
  };
  (patched as any).__keTimeZonePatched = true;
  Date.prototype[method] = patched as any;
}

export function installKenyanTimeZone() {
  patchMethod('toLocaleString');
  patchMethod('toLocaleDateString');
  patchMethod('toLocaleTimeString');
}

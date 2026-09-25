export function operationalToggleUpdate(key: string, checked: boolean) {
  return { [key]: checked };
}

export function isMpesaSettingsUpdate(update: Record<string, unknown>) {
  return ["paybill_till", "paybill_account", "paybill_name", "mpesa_require_validation"]
    .some(key => Object.prototype.hasOwnProperty.call(update, key));
}

export function mergeSavedShop(
  current: Record<string, any>,
  response: any,
  update: Record<string, unknown>,
) {
  if (!response || Array.isArray(response) || response.success === false ||
      response.error || !(response._id || response.id)) {
    throw new Error(response?.error || response?.message || "The server did not confirm the shop update.");
  }
  return { ...current, ...response, ...update };
}
function createDatePickerSession({ open, dismiss, onPick, onClose }) {
  let started = false;
  let active = true;
  let settled = false;
  const finish = date => {
    if (!active || settled) return;
    settled = true;
    if (date instanceof Date && Number.isFinite(date.getTime())) onPick(new Date(date.getTime()));
    onClose();
  };
  return {
    start(value) {
      if (started || !active) return;
      started = true;
      open({ value: new Date(value.getTime()), mode: 'date',
        onValueChange: (_event, date) => finish(date), onDismiss: () => finish(), onError: () => finish() });
    },
    stop() { active = false; if (started) void Promise.resolve(dismiss('date')).catch(() => {}); },
  };
}
module.exports = { createDatePickerSession };

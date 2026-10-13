import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createDatePickerSession } from '@/lib/date-picker-session.cjs';

// Mount once per user action. Clock ticks and server refreshes must never reopen
// an Android dialog or leave old native callbacks able to overwrite the draft.
export function TaskDatePicker({ value, onPick, onClose }) {
  const [initialValue] = useState(() => value ?? new Date());
  const callbacks = useRef({ onPick, onClose });
  useEffect(() => { callbacks.current = { onPick, onClose }; }, [onPick, onClose]);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const session = createDatePickerSession({
      open: DateTimePickerAndroid.open, dismiss: DateTimePickerAndroid.dismiss,
      onPick: date => callbacks.current.onPick(date), onClose: () => callbacks.current.onClose(),
    });
    session.start(initialValue);
    return () => session.stop();
  }, [initialValue]);
  if (Platform.OS === 'android') return null;
  return <DateTimePicker value={value ?? initialValue} mode="date"
    display={Platform.OS === 'ios' ? 'inline' : 'default'} onDismiss={onClose}
    onValueChange={(_event, date) => { if (date) onPick(date); onClose(); }} />;
}

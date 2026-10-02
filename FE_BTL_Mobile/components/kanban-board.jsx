import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const COLUMNS = [
  { value: 'CHUA_LAM', label: 'Chưa làm', color: '#6366F1' },
  { value: 'DANG_LAM', label: 'Đang làm', color: '#F59E0B' },
  { value: 'HOAN_THANH', label: 'Hoàn thành', color: '#10B981' },
];

function DragCard({ task, columnIndex, theme, onOpen, onMove, moving }) {
  const startX = useRef(0);
  const [dragX, setDragX] = useState(0);
  function release() {
      const direction = dragX > 55 ? 1 : dragX < -55 ? -1 : 0;
      const nextIndex = columnIndex + direction;
      if (direction && nextIndex >= 0 && nextIndex < COLUMNS.length) onMove(task, COLUMNS[nextIndex].value);
      else if (Math.abs(dragX) < 8) onOpen(task);
      setDragX(0);
  }
  return <View
    onStartShouldSetResponder={() => !moving}
    onResponderGrant={(event) => { startX.current = event.nativeEvent.pageX; }}
    onResponderMove={(event) => setDragX(event.nativeEvent.pageX - startX.current)}
    onResponderRelease={release}
    onResponderTerminate={() => setDragX(0)}
    style={{ transform: [{ translateX: dragX }], opacity: moving ? 0.55 : 1 }}>
    <View accessibilityHint="Kéo ngang để đổi trạng thái" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 13, gap: 8 }}>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{task.tieuDe}</Text>
      {!!task.moTa && <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 12 }}>{task.moTa}</Text>}
      {task.hanHoanThanh && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name="calendar-outline" size={12} color={theme.muted} />
        <Text style={{ color: theme.muted, fontSize: 11 }}>{new Date(task.hanHoanThanh).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>}
      {task.lapLai && task.lapLai !== 'KHONG' && <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>↻ Công việc lặp lại</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.muted, fontSize: 10 }}>Kéo ngang để chuyển cột</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {columnIndex > 0 && <Pressable accessibilityLabel="Chuyển sang cột trước" disabled={moving} onPress={() => onMove(task, COLUMNS[columnIndex - 1].value)}><Ionicons name="arrow-back-circle" size={23} color={theme.primary} /></Pressable>}
          {columnIndex < COLUMNS.length - 1 && <Pressable accessibilityLabel="Chuyển sang cột sau" disabled={moving} onPress={() => onMove(task, COLUMNS[columnIndex + 1].value)}><Ionicons name="arrow-forward-circle" size={23} color={theme.primary} /></Pressable>}
        </View>
      </View>
    </View>
  </View>;
}

export function KanbanBoard({ tasks, theme, onOpen, onMove, movingId, refreshing, onRefresh }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 120, gap: 12 }}>
    {COLUMNS.map((column, columnIndex) => {
      const items = tasks.filter(task => task.trangThai === column.value || (column.value === 'CHUA_LAM' && task.trangThai === 'QUA_HAN'));
      return <View key={column.value} style={{ width: 286, backgroundColor: `${column.color}0D`, borderColor: `${column.color}44`, borderWidth: 1, borderRadius: 18, padding: 12, alignSelf: 'flex-start', maxHeight: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: column.color, fontWeight: '800', fontSize: 15 }}>{column.label}</Text>
          <View style={{ backgroundColor: `${column.color}20`, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: column.color, fontWeight: '800' }}>{items.length}</Text></View>
        </View>
        <ScrollView nestedScrollEnabled contentContainerStyle={{ gap: 10, paddingBottom: 8 }} refreshing={refreshing} onRefresh={onRefresh}>
          {items.length === 0 && <Text style={{ color: theme.muted, textAlign: 'center', paddingVertical: 24 }}>Chưa có công việc</Text>}
          {items.map(task => <DragCard key={task.id} task={task} columnIndex={columnIndex} theme={theme} onOpen={onOpen} onMove={onMove} moving={movingId === task.id} />)}
        </ScrollView>
      </View>;
    })}
  </ScrollView>;
}

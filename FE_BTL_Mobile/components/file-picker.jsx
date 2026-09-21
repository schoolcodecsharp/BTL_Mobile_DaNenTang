import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { apiUpload } from '@/lib/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function FileItem({ file, onRemove, theme }) {
  const isImage = IMAGE_TYPES.includes(file.mimetype);
  return (
    <View style={[styles.fileItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {isImage ? (
        <Image source={{ uri: file.url }} style={styles.fileThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.fileIcon, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="document-outline" size={22} color={theme.primary} />
        </View>
      )}
      <View style={styles.fileInfo}>
        <Text numberOfLines={1} style={[styles.fileName, { color: theme.text }]}>{file.filename}</Text>
        <Text style={[styles.fileSize, { color: theme.muted }]}>
          {(file.size / 1024).toFixed(1)} KB
        </Text>
      </View>
      <TouchableOpacity onPress={() => onRemove(file.url)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={20} color="#E11D48" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * FilePicker component.
 *
 * Props:
 *  - attachments: array of {url, filename, mimetype, size}
 *  - onChange: (attachments) => void
 *  - theme: { surface, border, text, muted, primary, iconBg }
 */
export function FilePicker({ attachments = [], onChange, theme: propTheme }) {
  const isDark = useColorScheme() === 'dark';
  const theme = propTheme ?? {
    surface: isDark ? '#151E31' : '#FFFFFF',
    border: isDark ? '#25324A' : '#E8ECF3',
    text: isDark ? '#F8FAFC' : '#172033',
    muted: isDark ? '#91A0B7' : '#6B7280',
    primary: '#5B5CE2',
    iconBg: isDark ? '#282A62' : '#EEF2FF',
  };

  const [uploading, setUploading] = useState(false);

  async function doUpload(pickedFiles) {
    if (!pickedFiles.length) return;
    setUploading(true);
    try {
      const result = await apiUpload(pickedFiles);
      onChange([...attachments, ...result.files]);
    } catch (err) {
      Alert.alert('Lỗi tải file', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Hãy cấp quyền truy cập thư viện ảnh trong Cài đặt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    const files = result.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName ?? `photo_${Date.now()}.jpg`,
      type: a.mimeType ?? 'image/jpeg',
    }));
    await doUpload(files);
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const files = result.assets.map((a) => ({
      uri: a.uri,
      name: a.name,
      type: a.mimeType ?? 'application/octet-stream',
    }));
    await doUpload(files);
  }

  function removeFile(url) {
    onChange(attachments.filter((f) => f.url !== url));
  }

  return (
    <View>
      {attachments.map((f) => (
        <FileItem key={f.url} file={f} onRemove={removeFile} theme={theme} />
      ))}

      {uploading && (
        <View style={[styles.uploadingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.uploadingText, { color: theme.muted }]}>Đang tải lên...</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={pickImage}
          disabled={uploading}
          style={[styles.pickBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="image-outline" size={18} color={theme.primary} />
          <Text style={[styles.pickBtnText, { color: theme.primary }]}>Thêm ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={pickDocument}
          disabled={uploading}
          style={[styles.pickBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="attach-outline" size={18} color={theme.primary} />
          <Text style={[styles.pickBtnText, { color: theme.primary }]}>Thêm file</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fileItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    padding: 10, marginBottom: 8, gap: 10,
  },
  fileThumb: { width: 44, height: 44, borderRadius: 8 },
  fileIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  fileSize: { fontSize: 11 },
  uploadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12,
    borderWidth: 1, padding: 12, marginBottom: 8,
  },
  uploadingText: { fontSize: 13 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  pickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10,
  },
  pickBtnText: { fontSize: 13, fontWeight: '600' },
});

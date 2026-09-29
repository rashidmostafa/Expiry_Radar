import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Takes or picks a photo and copies it into the app's documents folder, since picker
 * results live in a cache the OS may clear. Returns undefined if the user cancels.
 */
export async function pickPhoto(from: 'camera' | 'library') {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] };
  if (from === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return undefined;
  }
  const result =
    from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return undefined;
  const uri = result.assets[0].uri;
  if (Platform.OS === 'web') return uri;

  const folder = new Directory(Paths.document, 'photos');
  if (!folder.exists) folder.create();
  const destination = new File(folder, `${Date.now()}.jpg`);
  new File(uri).copy(destination);
  return destination.uri;
}

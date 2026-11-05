import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Platform } from 'react-native';

export interface ProcessedPhoto {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

/**
 * Requests camera permission and opens the camera.
 * If camera is unavailable or permission denied, falls back to media library.
 * Resizes photo to max width 1280px with JPEG quality 0.7.
 */
export async function captureContainerPhoto(): Promise<ProcessedPhoto | null> {
  try {
    let result: ImagePicker.ImagePickerResult;

    if (Platform.OS !== 'web') {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.granted) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryStatus.granted) {
          Alert.alert('Permission Denied', 'Camera or photo library access is needed to capture container photos.');
          return null;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
      }
    } else {
      // Web fallback
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
    }

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const sourceUri = asset.uri;

    // Resize on device to max width 1280px, JPEG quality 0.7
    const actions: ImageManipulator.Action[] = [];
    if (asset.width && asset.width > 1280) {
      actions.push({ resize: { width: 1280 } });
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      actions,
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipulated.uri,
      width: manipulated.width,
      height: manipulated.height,
      fileSize: asset.fileSize,
    };
  } catch (err: any) {
    console.warn('Failed to capture or manipulate photo:', err);
    Alert.alert('Photo Error', 'Failed to capture or optimize container photo: ' + (err.message || 'Unknown error'));
    return null;
  }
}

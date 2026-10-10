import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8080/api/v1`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }

  return 'http://localhost:8080/api/v1';
};

const API_BASE_URL = getBaseUrl();

export default API_BASE_URL;

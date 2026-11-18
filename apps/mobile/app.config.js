module.exports = ({config}) => {
  const apiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (process.env.EAS_BUILD_PLATFORM === 'android' && !apiKey) throw new Error('Configura GOOGLE_MAPS_ANDROID_API_KEY en el entorno de compilación.');
  return {...config, version:'0.1.15', android:{...config.android, versionCode:16},
    plugins:[...config.plugins,'./plugins/withWorkDatabaseConstructor',['react-native-maps',{androidGoogleMapsApiKey:apiKey}]]};
};


export const useFeatureFlag = (flagName: string): boolean => {
  const envValue = import.meta.env[flagName];
  return envValue === 'true';
};
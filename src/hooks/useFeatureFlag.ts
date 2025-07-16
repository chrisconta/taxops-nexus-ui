export const useFeatureFlag = (flagName: string): boolean => {
  const envValue = import.meta.env[flagName];
  
  console.log('Feature flag check:', { 
    flagName, 
    envValue, 
    result: envValue === 'true',
    allEnvs: import.meta.env
  });
  
  return envValue === 'true';
};
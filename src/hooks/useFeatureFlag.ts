export const useFeatureFlag = (flagName: string): boolean => {
  // Support both VITE_ and REACT_APP_ environment variables
  const viteFlag = import.meta.env[flagName];
  const reactFlag = import.meta.env[`VITE_${flagName.replace('REACT_APP_', '')}`];
  
  return viteFlag === 'true' || reactFlag === 'true';
};
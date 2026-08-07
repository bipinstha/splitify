import * as Crypto from 'expo-crypto';

// Satisfy the requirement for loadGetRandomValues
// Amplify v6 calls this to ensure crypto.getRandomValues is available
export const loadGetRandomValues = () => {
  if (typeof global.crypto !== 'object') {
    // @ts-ignore
    global.crypto = {};
  }
  if (typeof global.crypto.getRandomValues !== 'function') {
    // @ts-ignore
    global.crypto.getRandomValues = (byteArray: Uint8Array) => {
      const randomBytes = Crypto.getRandomBytes(byteArray.length);
      for (let i = 0; i < byteArray.length; i++) {
        byteArray[i] = randomBytes[i];
      }
      return byteArray;
    };
  }
};

// Satisfy other potential imports from the package
export const RTNWebBrowser = null;
export const RTNDevice = null;

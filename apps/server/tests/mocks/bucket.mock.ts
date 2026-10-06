export function createMockBucket(): R2Bucket {
  const unexpected = (): never => {
    throw new TypeError('Unexpected bucket operation in test');
  };

  return {
    head: unexpected,
    get: unexpected,
    put: unexpected,
    createMultipartUpload: unexpected,
    resumeMultipartUpload: unexpected,
    delete: async () => undefined,
    list: async () => ({ objects: [], truncated: false, delimitedPrefixes: [] }),
  };
}

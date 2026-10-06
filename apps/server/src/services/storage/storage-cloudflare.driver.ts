import type { StorageDriver } from '#/types/storage.types';

export function storageCloudflareDriver(bucket: R2Bucket): StorageDriver {
  return {
    get: (key) => bucket.get(key),
    put: async (params) => {
      await bucket.put(params.key, params.body, { httpMetadata: { contentType: params.contentType } });
    },
    list: async (params) => {
      const listed = await bucket.list(params);

      return {
        keys: listed.objects.map((object) => object.key),
        prefixes: listed.delimitedPrefixes,
        cursor: listed.truncated ? listed.cursor : undefined,
      };
    },
    removeKeys: (keys) => bucket.delete(keys),
  };
}

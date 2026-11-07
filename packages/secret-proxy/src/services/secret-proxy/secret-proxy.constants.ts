export const SECRET_PROXY = {
  placeholderPrefix: 'bots-secret-',
  placeholderSuffix: '-placeholder',
  placeholderTagLength: 32,
  bundleFile: 'ca-bundle.pem',
  scrubMaxBytes: 2 * 1024 * 1024,
  loopback: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
  noProxy: 'localhost,127.0.0.1,::1',
  proxyEnv: ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'],
  noProxyEnv: ['NO_PROXY', 'no_proxy'],
  caEnv: ['SSL_CERT_FILE', 'CURL_CA_BUNDLE', 'REQUESTS_CA_BUNDLE', 'NODE_EXTRA_CA_CERTS', 'GIT_SSL_CAINFO', 'CARGO_HTTP_CAINFO'],
} as const;

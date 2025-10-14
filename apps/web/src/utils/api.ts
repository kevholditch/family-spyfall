/**
 * Get the API server URL based on the current hostname
 * When running locally, uses the same hostname with port 4000
 * When running on a domain, assumes API is available at api.{domain}
 */
export function getApiUrl(): string {
  const { protocol, hostname } = window.location;
  
  // Check if we're running on localhost or a local IP
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\./.test(hostname) || /^10\./.test(hostname);
  
  if (isLocal) {
    // Local development: use same hostname with port 4000
    return `${protocol}//${hostname}:4000`;
  } else {
    // Production: assume API is at api.{domain}
    // Remove www. prefix if present, then add api. prefix
    const domain = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
    // If domain already starts with a subdomain (like web.), extract the root domain
    const parts = domain.split('.');
    if (parts.length > 2) {
      // Has subdomain, use root domain (e.g., web.example.com -> example.com)
      const rootDomain = parts.slice(1).join('.');
      return `${protocol}//api.${rootDomain}`;
    } else {
      // No subdomain, use as-is
      return `${protocol}//api.${domain}`;
    }
  }
}

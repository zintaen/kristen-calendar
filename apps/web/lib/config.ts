export const config = {
  get apiBaseUrl() {
    // Determine the base URL dynamically or fallback to localhost
    let base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    
    // Remove trailing slash if present
    if (base.endsWith("/")) {
      base = base.slice(0, -1);
    }
    
    return base;
  },

  getApiUrl(path: string) {
    const safePath = path.startsWith("/") ? path : `/${path}`;
    return `${this.apiBaseUrl}${safePath}`;
  }
};

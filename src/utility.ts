export function domainFromUrlString (url: string): string {
    const hostname = new URL(url).hostname;
    if (hostname.startsWith("www.")) {
        return hostname.substring(4);
    }
    return hostname;
}

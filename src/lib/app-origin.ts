// Configuration only: never build authentication email links from a submitted
// form field, query parameter or an untrusted forwarded host header.
export function appOrigin() {
  const configured = process.env.APP_ORIGIN || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3004" : "");
  if (!configured) throw new Error("L’adresse du site n’est pas configurée.");
  const url = new URL(configured);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" || !(url.protocol === "https:" || (url.protocol === "http:" && local && process.env.NODE_ENV !== "production"))) throw new Error("L’adresse du site doit être une origine HTTPS, ou une adresse locale en développement.");
  return url.origin;
}

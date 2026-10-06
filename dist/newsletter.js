const signup = document.getElementById("newsletter-signup");
const newsletterStatus = document.getElementById("newsletter-status");
let newsletterUrl;
try {
  const url = new URL(radarConfig.newsletterSignupUrl);
  if (url.protocol === "https:" && url.hostname === "docs.google.com"
      && url.pathname.startsWith("/forms/d/e/") && url.pathname.endsWith("/viewform")) {
    newsletterUrl = url.href;
  }
} catch { /* No newsletter has been configured yet. */ }
if (signup) {
  signup.hidden = !newsletterUrl;
  if (newsletterUrl) {
    signup.href = newsletterUrl;
    signup.target = "_blank";
    signup.rel = "noopener noreferrer";
  } else {
    signup.removeAttribute("href");
  }
}
if (newsletterStatus) newsletterStatus.hidden = !!newsletterUrl;

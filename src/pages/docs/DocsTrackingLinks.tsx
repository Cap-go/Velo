import { CodeBlock } from "../../components/CodeBlock";
import { appBaseUrl } from "../../lib/constants";
import { buildPostbackUrl, buildTrackingUrl } from "../../lib/tracking";

export function DocsTrackingLinks() {
  const base = appBaseUrl();
  return (
    <>
      <h1>Tracking links</h1>
      <p>
        Each affiliate gets a short link. When clicked, Capve records the visit, assigns a click
        ID, and redirects to your program destination URL.
      </p>
      <h2>Link format</h2>
      <CodeBlock>{buildTrackingUrl(base, "{affiliate_code}")}</CodeBlock>
      <h2>Redirect parameters</h2>
      <p>Capve appends these query parameters to your destination URL:</p>
      <ul>
        <li>
          <code>velo_ref</code> — affiliate code (legacy / readable)
        </li>
        <li>
          <code>click_id</code> — unique click token (use this for postbacks)
        </li>
      </ul>
      <h2>Same-host deep links</h2>
      <p>
        Optional <code>?url=</code> override is allowed only when the host matches your program
        destination (prevents open redirects).
      </p>
      <CodeBlock>{`${buildTrackingUrl(base, "abc123")}?url=${encodeURIComponent("https://yourapp.com/checkout?plan=pro")}`}</CodeBlock>
      <h2>Offer URL macro</h2>
      <p>
        In your affiliate network, pass the click ID using the macro from the landing URL. Capve
        exposes <code>click_id</code> on redirect — configure your network postback to call:
      </p>
      <CodeBlock>{buildPostbackUrl(base)}</CodeBlock>
    </>
  );
}

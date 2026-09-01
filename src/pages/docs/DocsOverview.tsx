import { Link } from "react-router-dom";
import { CodeBlock } from "../../components/CodeBlock";
import { appBaseUrl } from "../../lib/constants";
import { buildPostbackUrl } from "../../lib/tracking";

export function DocsOverview() {
  const base = appBaseUrl();
  return (
    <>
      <h1>Capve tracking overview</h1>
      <p>
        Capve follows the same attribution model as professional trackers like Binom: every click
        gets a unique <strong>click ID</strong>, you pass that ID to your affiliate network or
        checkout, and conversions fire back via a <strong>postback URL</strong>.
      </p>
      <h2>Flow</h2>
      <ol>
        <li>Affiliate shares <code>{base}/r/&#123;code&#125;</code></li>
        <li>Visitor clicks → Capve records the click and redirects with <code>click_id</code></li>
        <li>Your offer URL or checkout stores <code>click_id</code></li>
        <li>On sale, network or your server calls the postback URL</li>
        <li>Capve matches conversion → click → affiliate → updates stats</li>
      </ol>
      <h2>Postback URL (incoming)</h2>
      <CodeBlock>{buildPostbackUrl(base)}</CodeBlock>
      <p>
        See <Link to="/docs/postback">Postback URL</Link> for network S2S setup, and{" "}
        <Link to="/docs/server-conversions">Server-side conversions</Link> for parameters and
        examples.
      </p>
    </>
  );
}

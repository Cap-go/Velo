import { CodeBlock } from "../../components/CodeBlock";
import { appBaseUrl } from "../../lib/constants";
import { snippetScriptTag } from "../../lib/integration-examples";

export function DocsBrowserAttribution() {
  const base = appBaseUrl();
  const checkoutExample = `const clickId = localStorage.getItem("click_id");
const affiliateCode = localStorage.getItem("velo_ref");

await stripe.checkout.sessions.create({
  // ...
  metadata: {
    click_id: clickId ?? "",
    velo_ref: affiliateCode ?? "",
  },
});`;

  return (
    <>
      <h1>Browser attribution</h1>
      <p>
        After redirect, your merchant site receives <code>velo_ref</code> and <code>click_id</code>{" "}
        in the URL. Add the Capve snippet to every page so values survive client-side navigation.
      </p>
      <h2>Attribution snippet</h2>
      <p>Place in the document head of your site:</p>
      <CodeBlock>{snippetScriptTag(base)}</CodeBlock>
      <p>
        The snippet reads <code>velo_ref</code> and <code>click_id</code> from the URL and stores
        them in <code>localStorage</code>. It does not call Capve from the browser.
      </p>
      <h2>Pass click ID to checkout</h2>
      <p>Before creating a Stripe Checkout session (or similar), read the stored click ID:</p>
      <CodeBlock>{checkoutExample}</CodeBlock>
      <p>
        In your payment webhook, read <code>metadata.click_id</code> and fire the Capve postback or
        server convert API.
      </p>
    </>
  );
}

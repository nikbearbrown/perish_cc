import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy - Perish',
  description: 'Cookie policy for the Perish platform.',
}

export default function CookiePolicyPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>Cookie Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 2026</p>

        <p>Perish uses three cookies. That&apos;s it. Here&apos;s exactly what they are and what they do.</p>

        <h2>Cookies We Use</h2>
        <table>
          <thead>
            <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>theme</code></td>
              <td>Stores your light/dark mode preference. Set by next-themes. Never leaves your browser.</td>
              <td>1 year</td>
            </tr>
            <tr>
              <td><code>admin_session</code></td>
              <td>Admin authentication. Set only if you log in as the site admin. httpOnly &mdash; not accessible to JavaScript.</td>
              <td>7 days</td>
            </tr>
            <tr>
              <td><code>perish_session</code></td>
              <td>Player authentication. Set when you register or log in. httpOnly &mdash; not accessible to JavaScript. Used to identify your account when you seed articles, cast votes, and post comments.</td>
              <td>30 days, refreshed on activity</td>
            </tr>
          </tbody>
        </table>

        <h2>Cookies We Do NOT Use</h2>
        <ul>
          <li>No advertising cookies</li>
          <li>No tracking cookies</li>
          <li>No third-party marketing or remarketing cookies</li>
          <li>No social media pixels</li>
          <li>No cross-site tracking of any kind</li>
        </ul>

        <h2>Third-Party Content</h2>
        <p>Embedded YouTube videos may set their own cookies when you interact with them. Substack content embedded on the platform may do the same. We do not control these. You can prevent them by not interacting with embedded content, or by using your browser&apos;s cookie controls.</p>

        <h2>The Anthropic API</h2>
        <p>Article generation involves sending text to Anthropic&apos;s API. This is a server-side API call &mdash; it does not set cookies in your browser. See our <a href="/privacy">Privacy Policy</a> for full details on AI generation.</p>

        <h2>Managing Cookies</h2>
        <p>You can manage or delete cookies through your browser settings. Disabling the <code>perish_session</code> cookie will log you out and prevent you from playing. The <code>theme</code> cookie can be safely deleted &mdash; you&apos;ll just be back to the default mode.</p>

        <h2>Do Not Track</h2>
        <p>We respect Do Not Track browser signals for analytics. DNT does not affect the functional cookies (<code>perish_session</code>, <code>admin_session</code>) required for the platform to operate.</p>

        <h2>Contact</h2>
        <p>Questions: <a href="mailto:bear@bearbrown.co">bear@bearbrown.co</a></p>
      </div>
    </div>
  )
}

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
        <p className="text-sm text-muted-foreground">Last updated: March 2026</p>

        <h2>Cookies We Use</h2>
        <table>
          <thead>
            <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td><code>theme</code></td><td>Stores your light/dark mode preference</td><td>1 year</td></tr>
            <tr><td><code>admin_session</code></td><td>Admin authentication (admin users only)</td><td>7 days</td></tr>
          </tbody>
        </table>

        <h2>Cookies We Do NOT Use</h2>
        <ul>
          <li>No advertising cookies</li>
          <li>No tracking cookies</li>
          <li>No third-party marketing cookies</li>
        </ul>

        <h2>Third-Party Cookies</h2>
        <p>Embedded YouTube videos and Substack content may set their own cookies. We do not control these.</p>

        <h2>Managing Cookies</h2>
        <p>You can manage or delete cookies through your browser settings. Disabling cookies may affect site functionality.</p>

        <h2>Do Not Track</h2>
        <p>We respect Do Not Track browser signals.</p>
      </div>
    </div>
  )
}

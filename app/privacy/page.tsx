import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Perish',
  description: 'Privacy policy for the Perish platform.',
}

export default function PrivacyPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 2026</p>

        <h2>1. Introduction</h2>
        <p>Perish (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Perish website. This policy describes how we collect, use, and protect your information.</p>

        <h2>2. Information We Collect</h2>
        <p>We collect minimal information necessary to operate the platform:</p>
        <ul>
          <li>Standard web server logs (IP addresses, browser type, pages visited)</li>
          <li>Analytics data via Vercel Analytics (anonymized usage patterns)</li>
          <li>Optional Google Analytics data if configured</li>
        </ul>

        <h2>3. How We Use Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Operate and maintain the website</li>
          <li>Understand usage patterns to improve content</li>
          <li>Ensure security and prevent abuse</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Vercel</strong> — Hosting and analytics</li>
          <li><strong>Neon</strong> — Database hosting</li>
          <li><strong>YouTube</strong> — Embedded video content</li>
          <li><strong>Substack</strong> — Newsletter content</li>
        </ul>

        <h2>5. Cookies</h2>
        <p>We use minimal cookies. See our <a href="/privacy/cookies">Cookie Policy</a> for details.</p>

        <h2>6. Data Retention</h2>
        <p>We retain data only as long as necessary for the purposes described in this policy.</p>

        <h2>7. Your Rights</h2>
        <p>You may request access to, correction of, or deletion of your personal data by contacting us at <a href="mailto:bear@bearbrown.co">bear@bearbrown.co</a>.</p>

        <h2>8. Contact</h2>
        <p>For questions about this privacy policy, contact us at <a href="mailto:bear@bearbrown.co">bear@bearbrown.co</a>.</p>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Perish',
  description: 'Terms of service for the Perish platform.',
}

export default function TermsPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 2026</p>

        <h2>1. Introduction</h2>
        <p>Welcome to Perish. By accessing or using this website, you agree to these Terms of Service.</p>

        <h2>2. Website Purpose</h2>
        <p>Perish is an educational platform providing course materials, tools, blog content, and resources related to the Irreducibly Human curriculum series.</p>

        <h2>3. Intellectual Property</h2>
        <p>Content on this site is released under the MIT License unless otherwise noted. You are free to use, modify, and distribute the content in accordance with the license terms.</p>

        <h2>4. Use License</h2>
        <p>Permission is granted to use the materials on this website for personal and educational purposes. You may not use the materials for commercial purposes without written consent.</p>

        <h2>5. User Conduct</h2>
        <p>You agree not to misuse the website or its content. This includes but is not limited to: attempting unauthorized access, distributing malware, or scraping content at scale.</p>

        <h2>6. Disclaimer</h2>
        <p>The materials on this website are provided on an &quot;as is&quot; basis. We make no warranties, expressed or implied, and disclaim all other warranties.</p>

        <h2>7. Limitations</h2>
        <p>In no event shall Perish or its operators be liable for any damages arising out of the use or inability to use the materials on this website.</p>

        <h2>8. Governing Law</h2>
        <p>These terms shall be governed by the laws of the State of Massachusetts.</p>

        <h2>9. Contact</h2>
        <p>For questions about these terms, contact us at <a href="mailto:bear@bearbrown.co">bear@bearbrown.co</a>.</p>
      </div>
    </div>
  )
}

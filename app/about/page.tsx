import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - Perish',
  description: 'About the Perish platform and the Irreducibly Human curriculum.',
}

export default function AboutPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-bold tracking-tighter">About</h1>
        <p className="text-lg text-muted-foreground mt-4">
          Perish is the publishing platform for the Irreducibly Human curriculum series
          — a 5-course graduate sequence exploring what AI can and can&apos;t do.
        </p>
        <h2>The Thesis</h2>
        <p>
          AI is superhuman at pattern recognition, fact retrieval, and syntactic correctness.
          Everything else — causal reasoning, ethical judgment, creative meaning-making,
          embodied teaching, and supervisory integration — remains irreducibly human.
        </p>
        <h2>The Courses</h2>
        <ol>
          <li><strong>BotSpeak</strong> — Fluency in AI Communication</li>
          <li><strong>Causal Reasoning</strong> — World Modeling Beyond Correlation</li>
          <li><strong>Ethical Play</strong> — Moral Imagination Under Uncertainty</li>
          <li><strong>AIMagineering</strong> — Creative Intelligence</li>
          <li><strong>Embodied Teaching</strong> — Mentorship and Presence</li>
        </ol>
        <h2>Contact</h2>
        <p>
          Perish is a production of Bear Brown &amp; Company. For questions about the
          series, reach out at{' '}
          <a href="mailto:bear@bearbrown.co">bear@bearbrown.co</a>.
        </p>
      </div>
    </div>
  )
}

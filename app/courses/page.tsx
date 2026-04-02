import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Courses - Perish',
  description: 'The Irreducibly Human curriculum: a 5-course graduate series on what AI can and can\'t do.',
}

const COURSES = [
  {
    title: 'BotSpeak: Fluency in AI Communication',
    tier: 'Foundation',
    description: 'Prompt engineering, model limitations, hallucination detection, and the rhetorical gap between human intent and machine output.',
    href: '/notes/Irreducibly-Human/Irreducibly-Human-Botspeak',
  },
  {
    title: 'Causal Reasoning and World Modeling',
    tier: 'Core',
    description: 'Counterfactual thinking, interventionist reasoning, and the kind of "why" questions that statistical models cannot answer.',
    href: '/notes/Irreducibly-Human/Irreducibly-Human-Causal-Reasoning',
  },
  {
    title: 'Ethical Play and Moral Imagination',
    tier: 'Core',
    description: 'Moral reasoning under uncertainty, value pluralism, and the limits of rule-based ethics.',
    href: '/notes/Irreducibly-Human/Irreducibly-Human-Ethical-Play',
  },
  {
    title: 'AIMagineering: Creative Intelligence',
    tier: 'Core',
    description: 'Creative process, aesthetic judgment, conceptual blending, and the difference between novelty and genuine originality.',
    href: '/notes/Irreducibly-Human/Irreducibly-Human-AImagineering',
  },
  {
    title: 'Embodied Teaching and Mentorship',
    tier: 'Capstone',
    description: 'Presence, improvisation, emotional attunement, and the embodied skills that make mentorship effective.',
    href: '/notes/Embodied-Teaching/Irreducibly-Human-Embodied-Teaching',
  },
  {
    title: 'Conducting AI',
    tier: 'Advanced',
    description: 'The five supervisory capacities: plausibility auditing, problem formulation, tool orchestration, interpretive judgment, and executive integration.',
    href: '/notes/Irreducibly-Human/Irreducibly-Human-Conducting-AI',
  },
  {
    title: 'The AI Sherpa',
    tier: 'Practitioner',
    description: 'A practitioner\'s guide for experiential learning — from design failure diagnosis through domain field guides.',
    href: '/notes/AI-Sherpa/Irreducibly-Human-AI-Sherpa',
  },
]

export default function CoursesPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tighter mb-4">Courses</h1>
        <p className="text-muted-foreground mb-10">
          The Irreducibly Human curriculum: a graduate series on what AI can and can&apos;t do.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((course) => (
            <Link key={course.title} href={course.href}>
              <div className="rounded-lg border bg-card p-6 shadow-sm hover:border-foreground/20 transition-colors h-full flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {course.tier}
                </span>
                <h3 className="text-lg font-bold tracking-tight mb-2">{course.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {course.description}
                </p>
                <span className="text-sm font-medium mt-4 inline-block">View Course →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

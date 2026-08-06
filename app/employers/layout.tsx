import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'TalentMesh for Employers',
    template: '%s | TalentMesh for Employers'
  },
  description: 'Enterprise Recruiting Platform & Smart Matching'
}

export default function EmployersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

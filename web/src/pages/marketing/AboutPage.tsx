import { useLanguage } from '@/lib/i18n'
import { useContentText } from '@/lib/content'
import { useDocumentMeta } from '@/lib/useDocumentMeta'
import { PageHero } from '@/components/PageHero'
import { useTeam } from '@/pages/marketing/MarketingHome'

export function AboutPage() {
  const { t, lang } = useLanguage()
  const ct = useContentText()
  const team = useTeam(lang, t)
  useDocumentMeta(
    'نبذة عنا | Pioneers Health Research',
    'تعرّف على منصة بيونيرز للأبحاث الصحية: رؤيتنا في تدريب وإشراف الباحثين، وفريقنا المتخصص.',
  )

  return (
    <div>
      <PageHero eyebrow={ct('home.about.eyebrow')} title={ct('home.about.title')} />

      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        <p className="mb-12 text-[16.5px] leading-[2.1] text-muted-2">{ct('home.about.body')}</p>

        <div className="rounded-2xl border border-border bg-bg-soft p-6 md:p-9">
          <div className="font-heading mb-5 text-xl font-bold text-navy">{ct('home.about.teamTitle')}</div>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {team.map((member, i) => (
              <div key={`${member.name}-${i}`} className="border-b border-border py-4 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="break-words text-[15.5px] font-semibold text-navy">{member.name}</span>
                  <span className="break-words text-[13.5px] text-muted">{member.role}</span>
                </div>
                {member.bio && <p className="mt-1 break-words text-[13px] leading-6 text-muted">{member.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

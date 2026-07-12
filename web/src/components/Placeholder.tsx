/** Temporary stand-in for a page not yet built in this phase. */
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <div className="font-heading text-xl font-bold text-navy">{title}</div>
      <div className="text-sm text-muted">قيد الإنشاء — سيُبنى في مرحلة لاحقة من هذا المشروع.</div>
    </div>
  )
}

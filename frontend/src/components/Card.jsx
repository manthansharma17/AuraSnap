// Standard white card with an optional title, subtitle and right-side action
export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-6 shadow-[0_10px_40px_-12px_rgba(46,148,136,0.2)] ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
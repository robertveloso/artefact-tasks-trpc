// Placeholder cards with the same shape as a task, shown while a list page is loading.
export function TaskSkeletons({ count = 3 }: { count?: number }) {
  return (
    <ul className="task-list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="task skeleton">
          <div className="skeleton-lines">
            <span className="skeleton-line" style={{ width: `${60 + ((i * 17) % 30)}%` }} />
            <span className="skeleton-line short" />
          </div>
        </li>
      ))}
    </ul>
  )
}

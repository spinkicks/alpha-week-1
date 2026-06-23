/** Placeholder for routes whose feature ships in a later milestone. */
export default function ComingSoon({
  title,
  milestone,
}: {
  title: string
  milestone: string
}) {
  return (
    <div className="screen-center">
      <h1>{title}</h1>
      <p>Coming in {milestone}.</p>
    </div>
  )
}

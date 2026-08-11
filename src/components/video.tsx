/**
 * Lecteur video responsive.
 *
 * Le ratio est porte par le conteneur (`aspect-video`) et l'iframe le remplit :
 * la video suit la largeur disponible sur telephone comme sur grand ecran, sans
 * hauteur fixe qui deborderait. `youtube-nocookie` evite de deposer un traceur
 * avant que le visiteur n'ait lance la lecture.
 */
export function VideoEmbed({
  id,
  title,
  start,
  className,
}: {
  id: string
  title: string
  start?: string
  className?: string
}) {
  const src = new URL(`https://www.youtube-nocookie.com/embed/${id}`)
  if (start) src.searchParams.set('start', start)

  return (
    <div className={className}>
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-sable-300 bg-encre-900 shadow-sm">
        <iframe
          src={src.toString()}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="size-full border-0"
        />
      </div>
    </div>
  )
}

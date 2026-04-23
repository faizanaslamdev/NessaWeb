import Image from 'next/image'

export default function PreviewSection() {
  return (
    <section className="relative bg-black pt-10 sm:pt-14 pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <Image
            src="/images/hero-section.png"
            alt="NessaChat preview"
            width={1920}
            height={1080}
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  )
}


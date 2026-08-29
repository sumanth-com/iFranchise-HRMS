import Image from "next/image";

import whatsNewIllustration from "@/assets/whatsnew.webp";

export function WhatsNewEmptyState() {
  return (
    <div className="whats-new-page-visual" aria-hidden>
      <Image
        src={whatsNewIllustration}
        alt=""
        fill
        priority
        sizes="100vw"
        className="whats-new-page-visual-img"
      />
    </div>
  );
}

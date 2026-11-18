import type { ComponentPropsWithRef } from 'react';
import type { CollectionId } from '../../logic/cropCollection';
import './journalCropCards.css';

export interface JournalCropCardData {
  id: CollectionId;
  name: string;
  description: string;
  quantity: string;
  best: string;
  recorded: boolean;
  icon: string;
}

/** Both outlines share a single stepped silhouette; the badge uses a smaller corner. */
export function PixelFrame({ className = '', children, ...props }: ComponentPropsWithRef<'div'>) {
  return <div {...props} className={`journal-pixel-frame ${className}`}>
    <div className="journal-pixel-frame__inside">{children}</div>
  </div>;
}

export function JournalCropCard({ entry, cardRef }: {
  entry: JournalCropCardData;
  cardRef?: ComponentPropsWithRef<'div'>['ref'];
}) {
  const separator = entry.best.indexOf(':');
  return <PixelFrame className="journal-crop-card" ref={cardRef} data-crop={entry.id} role="group" aria-label={entry.name}>
    <img className="journal-crop-card__icon" src={entry.icon} alt="" draggable={false} />
    <div className="journal-crop-card__copy">
      <div className="journal-crop-card__name">{entry.name}</div>
      <div className="journal-crop-card__description">{entry.description}</div>
    </div>
    <div className="journal-crop-card__totals">
      <PixelFrame className="journal-crop-quantity">{entry.quantity}</PixelFrame>
      {entry.best && <div className="journal-crop-card__record" aria-label={entry.best}>
        {separator < 0 ? entry.best : <>
          <span>{entry.best.slice(0, separator + 1)}</span>
          <span>{entry.best.slice(separator + 1).trim()}</span>
        </>}
      </div>}
    </div>
  </PixelFrame>;
}

'use client';

import { useRef, useState } from 'react';
import { MAX_IMAGE_BYTES } from '@/lib/images';
import { ImageIcon } from '@/components/ui/icons';
import buttons from '@/components/ui/buttons.module.css';
import styles from './PatternImageField.module.css';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

type Props = {
  /** Existing image URL or a local preview of the picked file. */
  src: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
  onError: (message: string) => void;
};

export function PatternImageField({ src, onPick, onRemove, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) { onError('Please choose a JPG, PNG, WebP or GIF image.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { onError('That image is over 5 MB — try a smaller one.'); return; }
    onPick(file);
  };

  const browse = () => inputRef.current?.click();

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }}
      />

      {src ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Pattern" className={styles.previewImg} />
          <div className={styles.previewActions}>
            <button type="button" onClick={browse} className={buttons.secondary}>Replace</button>
            <button type="button" onClick={onRemove} className={buttons.danger}>Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={browse}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files?.[0]); }}
          className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
        >
          <span className={styles.dropIcon}><ImageIcon size={22} /></span>
          <span className={styles.dropTitle}>Upload an image</span>
          <span className={styles.dropHint}>A photo of the finished piece or the pattern chart · JPG, PNG, WebP or GIF, up to 5 MB</span>
        </button>
      )}
    </div>
  );
}

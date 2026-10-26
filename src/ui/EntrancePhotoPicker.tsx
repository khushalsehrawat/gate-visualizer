interface Props {
  disabled: boolean;
  onChoose: (file: File) => void;
  galleryLabel?: string;
}

export function EntrancePhotoPicker({ disabled, onChoose, galleryLabel = 'Choose entrance image' }: Props) {
  function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (file) onChoose(file);
    input.value = '';
  }
  return <div className="entrance-photo-picker">
    <label className="field-label">{galleryLabel}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={(event) => choose(event.currentTarget)} /></label>
    <label className="field-label">Take entrance photo<input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" disabled={disabled} onChange={(event) => choose(event.currentTarget)} /></label>
    <p className="fine-print">Choose a saved JPG, PNG or WebP of any entrance, or photograph one. A picture on a screen or printed page can be photographed for a 2D preview; it is not a tracked AR entrance.</p>
  </div>;
}

/**
 * Minimal timeline: a play/pause transport, a scrubber across the frame range,
 * and diamond markers for each keyframe. Scrubbing samples the animation;
 * clicking a keyframe marker jumps exactly to it so it can be edited. Landing
 * the playhead exactly on a keyframe also reveals an ease-preset dropdown for
 * the segment leaving it (hidden on the last keyframe, whose easeOut is never
 * read).
 */

import { EASE_PRESETS, frameRange, type EasePreset, type Keyframe } from '../rig/animation';

const EASE_LABELS: Record<EasePreset, string> = {
  linear: 'Linear',
  easeIn: 'Ease In',
  easeOut: 'Ease Out',
  easeInOut: 'Ease In-Out',
};

interface TimelineProps {
  frame: number;
  endFrame: number;
  playing: boolean;
  keyframes: readonly Keyframe[];
  onScrub: (frame: number) => void;
  onTogglePlay: () => void;
  onSelectKeyframe: (frame: number) => void;
  onChangeEase: (frame: number, easeOut: EasePreset) => void;
}

export function Timeline({
  frame,
  endFrame,
  playing,
  keyframes,
  onScrub,
  onTogglePlay,
  onSelectKeyframe,
  onChangeEase,
}: TimelineProps) {
  const selected = keyframes.find((k) => Math.round(frame) === k.frame);
  const isLastKeyframe =
    selected !== undefined && selected.frame === frameRange({ keyframes })?.end;

  return (
    <div className="timeline">
      <button className="transport" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? '❚❚' : '►'}
      </button>

      <div className="scrubber">
        <input
          type="range"
          min={0}
          max={endFrame}
          step={1}
          value={frame}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Scrub frame"
        />
        <div className="markers">
          {keyframes.map((k) => (
            <button
              key={k.frame}
              className="keyframe-marker"
              style={{ left: `${(k.frame / endFrame) * 100}%` }}
              title={`Keyframe at frame ${k.frame}`}
              aria-label={`Select keyframe at frame ${k.frame}`}
              onClick={() => onSelectKeyframe(k.frame)}
            />
          ))}
        </div>
      </div>

      <div className="frame-readout">
        <span className={selected ? 'frame-num on-key' : 'frame-num'}>{Math.round(frame)}</span>
        <span className="frame-total">/ {endFrame}</span>
      </div>

      {selected && !isLastKeyframe && (
        <label className="ease-select">
          Ease out
          <select
            aria-label={`Ease out for keyframe at frame ${selected.frame}`}
            value={selected.easeOut}
            onChange={(e) => onChangeEase(selected.frame, e.target.value as EasePreset)}
          >
            {EASE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {EASE_LABELS[preset]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

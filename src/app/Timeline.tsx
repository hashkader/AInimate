/**
 * Minimal timeline: a play/pause transport, a scrubber across the frame range,
 * and diamond markers for each keyframe. Scrubbing samples the animation;
 * clicking a keyframe marker jumps exactly to it so it can be edited.
 */

interface TimelineProps {
  frame: number;
  endFrame: number;
  playing: boolean;
  keyframeFrames: readonly number[];
  onScrub: (frame: number) => void;
  onTogglePlay: () => void;
  onSelectKeyframe: (frame: number) => void;
}

export function Timeline({
  frame,
  endFrame,
  playing,
  keyframeFrames,
  onScrub,
  onTogglePlay,
  onSelectKeyframe,
}: TimelineProps) {
  const onKeyframe = keyframeFrames.some((f) => Math.round(frame) === f);

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
          {keyframeFrames.map((f) => (
            <button
              key={f}
              className="keyframe-marker"
              style={{ left: `${(f / endFrame) * 100}%` }}
              title={`Keyframe at frame ${f}`}
              aria-label={`Select keyframe at frame ${f}`}
              onClick={() => onSelectKeyframe(f)}
            />
          ))}
        </div>
      </div>

      <div className="frame-readout">
        <span className={onKeyframe ? 'frame-num on-key' : 'frame-num'}>{Math.round(frame)}</span>
        <span className="frame-total">/ {endFrame}</span>
      </div>
    </div>
  );
}

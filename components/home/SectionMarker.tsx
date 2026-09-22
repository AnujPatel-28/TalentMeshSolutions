/**
 * The mono rule that opens every section on `/`.
 *
 * This markup was previously copy-pasted into all seven home sections, which is
 * how the index drifted out of sequence (`[02] [03] [04] [06] [07]`, with no
 * `[01]` and a `[05]` that only existed in a commented-out component). Keeping
 * one source means the numbering and the brand blue can only be wrong once.
 *
 * `index` is the position in the scroll order and is zero-padded for display.
 * `children` renders on the trailing edge in place of the index — Services uses
 * it for nothing, but the slot keeps the rule reusable for a section that needs
 * live status there.
 */
export default function SectionMarker({
    label,
    index,
    children,
}: {
    label: string;
    index?: number;
    children?: React.ReactNode;
}) {
    return (
        // sticky: each marker pins under the navbar for the length of its own
        // section, then the next section's marker scrolls up and pushes it out.
        // The stick works because each marker's containing block is its own
        // <section> — no JS, no scroll listener. Any ancestor with
        // `overflow: hidden` silently disables it (see GridWrapper).
        <div className="sticky top-[60px] z-30 w-full flex justify-between items-center py-3.5 px-6 border-b border-gray-200 text-xs font-mono tracking-widest text-gray-500 uppercase bg-white/85 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-white">
            <div className="flex items-center gap-2">
                <span className="text-brand font-bold">›</span> {label}
            </div>
            <div>{children ?? (index !== undefined ? `[${String(index).padStart(2, '0')}]` : null)}</div>
        </div>
    );
}

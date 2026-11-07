const COLORS = ['#5B3DF5', '#7A3DF0', '#9A3DE6', '#B83DD2', '#D23DB4', '#E03D98', '#E83E8C'];

/** Logo "TVinhhh": mỗi chữ một màu, rê chuột vào thì từng chữ nhảy lên lần lượt */
export default function Wordmark({ className = 'text-2xl' }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`} aria-label="TVinhhh">
      {'TVinhhh'.split('').map((ch, i) => (
        <span key={i} style={{ ['--i' as string]: i, color: COLORS[i] }} aria-hidden="true">{ch}</span>
      ))}
    </span>
  );
}
